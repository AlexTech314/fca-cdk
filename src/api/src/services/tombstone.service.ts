import { tombstoneRepository } from '../repositories/tombstone.repository';
import type { TombstoneQuery, CreateTombstoneInput, UpdateTombstoneInput } from '../models/tombstone.model';
import { matchContentToTags } from '../lib/taxonomy';

export const tombstoneService = {
  async list(query: TombstoneQuery) {
    return tombstoneRepository.findMany(query);
  },

  async getBySlug(slug: string) {
    return tombstoneRepository.findBySlug(slug);
  },

  async getById(id: string) {
    return tombstoneRepository.findById(id);
  },

  async getByPreviewToken(slug: string, token: string) {
    return tombstoneRepository.findByPreviewToken(slug, token);
  },

  async create(data: CreateTombstoneInput) {
    // Auto-generate tags from industry/keywords if not provided
    if (!data.tagIds && data.industry) {
      const matchedTags = matchContentToTags(data.industry);
      // Will need to look up tag IDs from slugs
      // For now, just create without auto-tags
    }
    return tombstoneRepository.create(data);
  },

  async update(id: string, data: UpdateTombstoneInput) {
    return tombstoneRepository.update(id, data);
  },

  async delete(id: string) {
    return tombstoneRepository.delete(id);
  },

  async publish(id: string, publish: boolean) {
    return tombstoneRepository.update(id, { isPublished: publish });
  },

  async linkPressRelease(id: string, pressReleaseId: string | null) {
    return tombstoneRepository.updatePressRelease(id, pressReleaseId);
  },

  async getRelated(slug: string) {
    return tombstoneRepository.findRelated(slug);
  },
};
