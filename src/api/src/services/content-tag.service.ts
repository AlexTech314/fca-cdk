import { contentTagRepository } from '../repositories/content-tag.repository';
import type { CreateContentTagInput, UpdateContentTagInput } from '../models/content-tag.model';

export const contentTagService = {
  async list() {
    return contentTagRepository.findAll();
  },

  async getBySlug(slug: string) {
    return contentTagRepository.findBySlug(slug);
  },

  async getBySlugWithContent(slug: string) {
    return contentTagRepository.findBySlugWithContent(slug);
  },

  async getByCategory(category: string) {
    return contentTagRepository.findByCategory(category);
  },

  async create(data: CreateContentTagInput) {
    return contentTagRepository.create(data);
  },

  async update(id: string, data: UpdateContentTagInput) {
    return contentTagRepository.update(id, data);
  },

  async delete(id: string) {
    return contentTagRepository.delete(id);
  },
};
