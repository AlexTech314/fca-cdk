import { pageContentRepository } from '../repositories/page-content.repository';
import type { PageContentInput, UpdatePageContentInput } from '../models/page-content.model';

export const pageContentService = {
  async list() {
    return pageContentRepository.findAll();
  },

  async getByKey(pageKey: string) {
    return pageContentRepository.findByKey(pageKey);
  },

  async upsert(data: PageContentInput) {
    return pageContentRepository.upsert(data);
  },

  async update(pageKey: string, data: UpdatePageContentInput) {
    return pageContentRepository.update(pageKey, data);
  },
};
