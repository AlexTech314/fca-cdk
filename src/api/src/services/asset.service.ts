import { randomUUID } from 'crypto';
import { assetRepository } from '../repositories/asset.repository';
import { generatePresignedUploadUrl, deleteS3Object, getS3Url } from '../lib/s3';
import type { CreateAssetInput, UpdateAssetInput, AssetQuery, PresignedUrlInput } from '../models/asset.model';

/**
 * Sanitize a file name for use in an S3 key.
 */
function sanitizeFileName(fileName: string): string {
  return fileName
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export const assetService = {
  list: (query: AssetQuery) => assetRepository.findMany(query),

  getById: (id: string) => assetRepository.findById(id),

  create: (data: CreateAssetInput) => assetRepository.create(data),

  update: (id: string, data: UpdateAssetInput) => assetRepository.update(id, data),

  async delete(id: string) {
    // Look up the asset to get the s3Key before deleting from DB
    const asset = await assetRepository.findById(id);
    if (!asset) {
      throw new Error('Asset not found');
    }

    // Delete from S3
    try {
      await deleteS3Object(asset.s3Key);
    } catch (error) {
      // Log but don't fail -- the DB record should still be cleaned up
      console.error(`Failed to delete S3 object ${asset.s3Key}:`, error);
    }

    // Delete from DB
    await assetRepository.delete(id);
  },

  async generatePresignedUrl(input: PresignedUrlInput) {
    const { fileName, fileType, prefix } = input;

    // Build the S3 key: {prefix}/{epoch}-{uuid}-{sanitized-fileName}
    // Epoch timestamp ensures keys are unique and naturally sortable
    const sanitized = sanitizeFileName(fileName);
    const epoch = Date.now();
    const uniqueId = randomUUID().slice(0, 8);
    const s3Prefix = prefix || 'uploads';
    const s3Key = `${s3Prefix}/${epoch}-${uniqueId}-${sanitized}`;

    const result = await generatePresignedUploadUrl(s3Key, fileType);

    return {
      ...result,
      publicUrl: getS3Url(s3Key),
    };
  },
};
