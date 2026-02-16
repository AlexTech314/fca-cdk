import { campaignRepository, campaignRunRepository } from '../repositories/campaign.repository';
import type { CreateCampaignInput, UpdateCampaignInput, StartCampaignRunInput } from '../models/campaign.model';
import { s3Client } from '../lib/s3';
import { PutObjectCommand, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';

const CAMPAIGN_DATA_BUCKET = process.env.CAMPAIGN_DATA_BUCKET || '';
const PRESIGNED_URL_EXPIRY = 3600; // 1 hour

function getSearchesS3Key(campaignId: string): string {
  return `campaigns/${campaignId}/searches.json`;
}

async function generateUploadUrl(campaignId: string): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: CAMPAIGN_DATA_BUCKET,
    Key: getSearchesS3Key(campaignId),
    ContentType: 'application/json',
  });
  return getSignedUrl(s3Client, command, { expiresIn: PRESIGNED_URL_EXPIRY });
}

async function fetchSearchesFromS3(s3Key: string): Promise<unknown[]> {
  try {
    const result = await s3Client.send(
      new GetObjectCommand({ Bucket: CAMPAIGN_DATA_BUCKET, Key: s3Key })
    );
    const bodyStr = await result.Body?.transformToString();
    if (!bodyStr) return [];
    const data = JSON.parse(bodyStr);
    return data.searches || [];
  } catch (error) {
    console.error(`Failed to fetch searches from S3 (${s3Key}):`, error);
    return [];
  }
}

export const campaignService = {
  async list() {
    return campaignRepository.findMany();
  },

  async getById(id: string) {
    const campaign = await campaignRepository.findById(id);
    if (!campaign) return null;

    // Fetch searches from S3 if available
    let searches: unknown[] = [];
    if (campaign.queriesS3Key) {
      searches = await fetchSearchesFromS3(campaign.queriesS3Key);
    }

    return { ...campaign, searches };
  },

  async create(data: CreateCampaignInput, userId?: string) {
    const campaign = await campaignRepository.create({
      ...data,
      queriesS3Key: '', // Will be set after upload
      createdById: userId,
    });

    // Set the S3 key and generate presigned URL
    const s3Key = getSearchesS3Key(campaign.id);
    await campaignRepository.update(campaign.id, { queriesS3Key: s3Key } as any);

    const uploadUrl = await generateUploadUrl(campaign.id);

    return {
      campaign: { ...campaign, queriesS3Key: s3Key },
      uploadUrl,
    };
  },

  async update(id: string, data: UpdateCampaignInput) {
    const campaign = await campaignRepository.update(id, data);

    let uploadUrl: string | undefined;
    if (data.updateSearches) {
      uploadUrl = await generateUploadUrl(id);
    }

    return { campaign, uploadUrl };
  },

  async delete(id: string) {
    await campaignRepository.delete(id);
  },

  async confirmUpload(id: string, searchesCount: number) {
    // Verify campaign exists
    const campaign = await campaignRepository.findById(id);
    if (!campaign) throw new Error('Campaign not found');

    // Verify S3 object exists
    if (campaign.queriesS3Key) {
      try {
        await s3Client.send(
          new HeadObjectCommand({ Bucket: CAMPAIGN_DATA_BUCKET, Key: campaign.queriesS3Key })
        );
      } catch {
        throw new Error('Searches file not found in S3. Upload before confirming.');
      }
    }

    return campaignRepository.confirmUpload(id, searchesCount);
  },
};

const lambdaClient = new LambdaClient({});
const START_PLACES_LAMBDA_ARN = process.env.START_PLACES_LAMBDA_ARN || '';

export const campaignRunService = {
  async listByCampaign(campaignId: string) {
    return campaignRunRepository.findByCampaignId(campaignId);
  },

  async getById(id: string) {
    return campaignRunRepository.findById(id);
  },

  async start(campaignId: string, userId?: string, options?: StartCampaignRunInput) {
    const campaign = await campaignRepository.findById(campaignId);
    if (!campaign) throw new Error('Campaign not found');
    if (!campaign.queriesS3Key) throw new Error('Campaign has no searches. Upload and confirm searches first.');

    const run = await campaignRunRepository.create({
      campaignId,
      startedById: userId,
      queriesTotal: campaign.queriesCount,
    });

    if (!START_PLACES_LAMBDA_ARN) {
      throw new Error('START_PLACES_LAMBDA_ARN not configured. Deploy the pipeline stack and set the env var.');
    }

    await lambdaClient.send(
      new InvokeCommand({
        FunctionName: START_PLACES_LAMBDA_ARN,
        InvocationType: 'Event',
        Payload: JSON.stringify({
          campaignId,
          campaignRunId: run.id,
          queriesS3Key: campaign.queriesS3Key,
          skipCachedSearches: options?.skipCachedSearches ?? campaign.skipCachedSearches,
          maxResultsPerSearch: options?.maxResultsPerSearch ?? campaign.maxResultsPerSearch,
        }),
      })
    );

    return run;
  },

  async getCampaignsOverTime(startDate: string, endDate: string) {
    return campaignRunRepository.getCampaignsOverTime(new Date(startDate), new Date(endDate));
  },
};
