import type { WebAdminApi } from './types';
import type {
  CreateTombstoneInput,
  UpdateTombstoneInput,
  CreateBlogPostInput,
  UpdateBlogPostInput,
  UpdatePageContentInput,
  CreateSubscriberInput,
  UpdateIntakeStatusInput,
  SendEmailInput,
  AnalyticsParams,
} from '@/types';
import {
  mockTombstones,
  mockBlogPosts,
  mockPages,
  mockSubscribers,
  mockIntakes,
  mockEmailNotifications,
  mockRecentActivity,
  mockTopPages,
  generatePageViewData,
} from '../mock-data';
import { generateId, slugify } from '../utils';

// Simulated network delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Mutable copies for CRUD operations
let tombstones = [...mockTombstones];
let blogPosts = [...mockBlogPosts];
let pages = [...mockPages];
let subscribers = [...mockSubscribers];
let intakes = [...mockIntakes];

export const mockApi: WebAdminApi = {
  // Dashboard
  async getDashboardStats() {
    await delay(200);
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    return {
      totalTombstones: tombstones.filter(t => t.isPublished).length,
      totalBlogPosts: blogPosts.filter(p => p.isPublished).length,
      totalSubscribers: subscribers.filter(s => s.isSubscribed).length,
      intakesThisWeek: intakes.filter(i => new Date(i.createdAt) >= weekAgo).length,
    };
  },

  async getRecentActivity() {
    await delay(150);
    return mockRecentActivity;
  },

  // Tombstones
  async getTombstones() {
    await delay(200);
    return [...tombstones].sort((a, b) => a.sortOrder - b.sortOrder);
  },

  async getTombstone(id) {
    await delay(150);
    const tombstone = tombstones.find(t => t.id === id);
    if (!tombstone) throw new Error('Tombstone not found');
    return tombstone;
  },

  async createTombstone(input: CreateTombstoneInput) {
    await delay(300);
    const now = new Date().toISOString();
    const newTombstone = {
      id: `tomb-${generateId()}`,
      name: input.name,
      slug: input.slug || slugify(input.name),
      imagePath: input.imagePath,
      industry: input.industry || null,
      role: input.role || null,
      dealDate: input.dealDate || null,
      description: input.description || null,
      newsSlug: input.newsSlug || null,
      sortOrder: input.sortOrder ?? tombstones.length + 1,
      isPublished: input.isPublished ?? false,
      previewToken: generateId(),
      createdAt: now,
      updatedAt: now,
    };
    tombstones.push(newTombstone);
    return newTombstone;
  },

  async updateTombstone(id, input: UpdateTombstoneInput) {
    await delay(300);
    const index = tombstones.findIndex(t => t.id === id);
    if (index === -1) throw new Error('Tombstone not found');
    
    tombstones[index] = {
      ...tombstones[index],
      ...input,
      slug: input.slug || (input.name ? slugify(input.name) : tombstones[index].slug),
      updatedAt: new Date().toISOString(),
    };
    return tombstones[index];
  },

  async deleteTombstone(id) {
    await delay(200);
    tombstones = tombstones.filter(t => t.id !== id);
  },

  async publishTombstone(id, isPublished) {
    await delay(200);
    const index = tombstones.findIndex(t => t.id === id);
    if (index === -1) throw new Error('Tombstone not found');
    
    tombstones[index] = {
      ...tombstones[index],
      isPublished,
      updatedAt: new Date().toISOString(),
    };
    return tombstones[index];
  },

  async reorderTombstones(ids) {
    await delay(200);
    ids.forEach((id, index) => {
      const tombstone = tombstones.find(t => t.id === id);
      if (tombstone) {
        tombstone.sortOrder = index + 1;
      }
    });
  },

  // Blog Posts
  async getBlogPosts() {
    await delay(200);
    return [...blogPosts].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  },

  async getBlogPost(id) {
    await delay(150);
    const post = blogPosts.find(p => p.id === id);
    if (!post) throw new Error('Blog post not found');
    return post;
  },

  async createBlogPost(input: CreateBlogPostInput) {
    await delay(300);
    const now = new Date().toISOString();
    const newPost = {
      id: `post-${generateId()}`,
      slug: input.slug || slugify(input.title),
      title: input.title,
      excerpt: input.excerpt || null,
      content: input.content,
      author: input.author || null,
      category: input.category || null,
      publishedAt: input.isPublished ? now : null,
      isPublished: input.isPublished ?? false,
      previewToken: generateId(),
      createdAt: now,
      updatedAt: now,
    };
    blogPosts.push(newPost);
    return newPost;
  },

  async updateBlogPost(id, input: UpdateBlogPostInput) {
    await delay(300);
    const index = blogPosts.findIndex(p => p.id === id);
    if (index === -1) throw new Error('Blog post not found');
    
    blogPosts[index] = {
      ...blogPosts[index],
      ...input,
      slug: input.slug || (input.title ? slugify(input.title) : blogPosts[index].slug),
      updatedAt: new Date().toISOString(),
    };
    return blogPosts[index];
  },

  async deleteBlogPost(id) {
    await delay(200);
    blogPosts = blogPosts.filter(p => p.id !== id);
  },

  async publishBlogPost(id, isPublished) {
    await delay(200);
    const index = blogPosts.findIndex(p => p.id === id);
    if (index === -1) throw new Error('Blog post not found');
    
    const now = new Date().toISOString();
    blogPosts[index] = {
      ...blogPosts[index],
      isPublished,
      publishedAt: isPublished ? (blogPosts[index].publishedAt || now) : null,
      updatedAt: now,
    };
    return blogPosts[index];
  },

  // Page Content
  async getPages() {
    await delay(200);
    return [...pages];
  },

  async getPage(pageKey) {
    await delay(150);
    const page = pages.find(p => p.pageKey === pageKey);
    if (!page) throw new Error('Page not found');
    return page;
  },

  async updatePage(pageKey, input: UpdatePageContentInput) {
    await delay(300);
    const index = pages.findIndex(p => p.pageKey === pageKey);
    if (index === -1) throw new Error('Page not found');
    
    pages[index] = {
      ...pages[index],
      ...input,
      updatedAt: new Date().toISOString(),
    };
    return pages[index];
  },

  // Analytics
  async getPageViews(params: AnalyticsParams) {
    await delay(300);
    return generatePageViewData(params.start, params.end);
  },

  async getTopPages(params: AnalyticsParams & { limit?: number }) {
    await delay(200);
    const limit = params.limit || 10;
    return mockTopPages.slice(0, limit);
  },

  // Subscribers
  async getSubscribers() {
    await delay(200);
    return [...subscribers].sort((a, b) => 
      new Date(b.subscribedAt).getTime() - new Date(a.subscribedAt).getTime()
    );
  },

  async createSubscriber(input: CreateSubscriberInput) {
    await delay(300);
    const now = new Date().toISOString();
    const newSubscriber = {
      id: `sub-${generateId()}`,
      email: input.email,
      name: input.name || null,
      source: input.source || 'manual',
      isSubscribed: true,
      subscribedAt: now,
      unsubscribedAt: null,
    };
    subscribers.push(newSubscriber);
    return newSubscriber;
  },

  async deleteSubscriber(id) {
    await delay(200);
    subscribers = subscribers.filter(s => s.id !== id);
  },

  async exportSubscribers() {
    await delay(300);
    const activeSubscribers = subscribers.filter(s => s.isSubscribed);
    const csv = [
      'email,name,source,subscribed_at',
      ...activeSubscribers.map(s => 
        `${s.email},"${s.name || ''}",${s.source || ''},${s.subscribedAt}`
      ),
    ].join('\n');
    return new Blob([csv], { type: 'text/csv' });
  },

  async importSubscribers(_file: File) {
    await delay(500);
    // Simulate import
    return { imported: 25, skipped: 3 };
  },

  // Seller Intakes
  async getIntakes() {
    await delay(200);
    return [...intakes].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  },

  async getIntake(id) {
    await delay(150);
    const intake = intakes.find(i => i.id === id);
    if (!intake) throw new Error('Intake not found');
    return intake;
  },

  async updateIntakeStatus(id, input: UpdateIntakeStatusInput) {
    await delay(200);
    const index = intakes.findIndex(i => i.id === id);
    if (index === -1) throw new Error('Intake not found');
    
    intakes[index] = {
      ...intakes[index],
      status: input.status,
      updatedAt: new Date().toISOString(),
    };
    return intakes[index];
  },

  async exportIntakes() {
    await delay(300);
    const csv = [
      'name,company,email,phone,status,created_at',
      ...intakes.map(i => 
        `"${i.name || ''}","${i.companyName || ''}",${i.email},"${i.phone || ''}",${i.status},${i.createdAt}`
      ),
    ].join('\n');
    return new Blob([csv], { type: 'text/csv' });
  },

  // Email
  async sendEmail(_input: SendEmailInput) {
    await delay(500);
    const activeCount = subscribers.filter(s => s.isSubscribed).length;
    return { sent: activeCount };
  },

  async previewEmail(input: SendEmailInput) {
    await delay(200);
    return {
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1>${input.subject}</h1>
          <div>${input.htmlContent}</div>
        </div>
      `,
    };
  },

  async getEmailHistory() {
    await delay(200);
    return mockEmailNotifications;
  },
};
