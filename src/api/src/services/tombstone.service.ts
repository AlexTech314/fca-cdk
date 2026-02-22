import { tombstoneRepository } from '../repositories/tombstone.repository';
import type { TombstoneQuery, CreateTombstoneInput, UpdateTombstoneInput } from '../models/tombstone.model';

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
  async create(data: CreateTombstoneInput) {
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
  async getFilterOptions() {
    return tombstoneRepository.getFilterOptions();
  },
};
