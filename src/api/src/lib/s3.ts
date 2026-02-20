import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// S3 client: use env credentials when set (local dev), otherwise default chain (Fargate task role)
// Explicit empty credentials break presigned URLs with "non-empty Access Key must be provided"
export const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-2',
  ...(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
    ? {
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        },
      }
    : {}),
  requestChecksumCalculation: 'WHEN_REQUIRED',
  responseChecksumValidation: 'WHEN_REQUIRED',
});

export const ASSETS_BUCKET_NAME = process.env.ASSETS_BUCKET_NAME || '';

/**
 * Build the full public URL for a given s3Key.
 * Uses CloudFront when configured, otherwise falls back to direct S3.
 */
export function getS3Url(s3Key: string): string {
  const cdnDomain = process.env.CDN_DOMAIN; // e.g. "d1bjh7dvpwoxii.cloudfront.net"
  if (cdnDomain) {
    return `https://${cdnDomain}/${s3Key}`;
  }
  const region = process.env.AWS_REGION || 'us-east-2';
  return `https://${ASSETS_BUCKET_NAME}.s3.${region}.amazonaws.com/${s3Key}`;
}

/**
 * Extract the S3 key from a full S3 URL.
 * e.g. "https://bucket.s3.region.amazonaws.com/tombstones/foo.jpg" -> "tombstones/foo.jpg"
 */
export function extractS3Key(url: string): string {
  try {
    const parsed = new URL(url);
    // Remove leading slash
    return parsed.pathname.slice(1);
  } catch {
    return url;
  }
}

/**
 * Generate a presigned PUT URL for uploading a file to S3.
 */
export async function generatePresignedUploadUrl(
  s3Key: string,
  contentType: string,
  expiresIn = 900 // 15 minutes
): Promise<{ uploadUrl: string; s3Key: string; expiresIn: number }> {
  const command = new PutObjectCommand({
    Bucket: ASSETS_BUCKET_NAME,
    Key: s3Key,
    ContentType: contentType,
    CacheControl: 'public, max-age=31536000, immutable',
  });

  const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn });

  return { uploadUrl, s3Key, expiresIn };
}

/**
 * Delete an object from S3 by its key.
 */
export async function deleteS3Object(s3Key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: ASSETS_BUCKET_NAME,
    Key: s3Key,
  });

  await s3Client.send(command);
}

