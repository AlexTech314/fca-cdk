import { blogPostRepository } from '../repositories/blog-post.repository';
import type { BlogPostQuery, CreateBlogPostInput, UpdateBlogPostInput } from '../models/blog-post.model';

export const blogPostService = {
  async list(query: BlogPostQuery) {
    return blogPostRepository.findMany(query);
  },

  async getBySlug(slug: string) {
    return blogPostRepository.findBySlug(slug);
  },

  async getById(id: string) {
    return blogPostRepository.findById(id);
  },

  async create(data: CreateBlogPostInput) {
    return blogPostRepository.create(data);
  },

  async update(id: string, data: UpdateBlogPostInput) {
    return blogPostRepository.update(id, data);
  },

  async delete(id: string) {
    return blogPostRepository.delete(id);
  },

  async publish(id: string, publish: boolean) {
    return blogPostRepository.publish(id, publish);
  },

  async getRelated(slug: string) {
    return blogPostRepository.findRelated(slug);
  },

  async getAdjacent(slug: string) {
    return blogPostRepository.findAdjacent(slug);
  },
};
