import { mockApi } from './mock';
import { realApi } from './real';
import type { WebAdminApi } from './types';

// Toggle between mock and real API
// Set VITE_USE_REAL_API=true in .env.local to use real API
export const USE_REAL_API = import.meta.env.VITE_USE_REAL_API === 'true';

const baseApi: WebAdminApi = USE_REAL_API ? realApi : mockApi;

/**
 * Structured API with namespaced methods for easier usage.
 * Wraps the flat WebAdminApi interface with nested objects.
 */
export const api = {
  // Dashboard
  dashboard: {
    getStats: () => baseApi.getDashboardStats(),
    getActivity: () => baseApi.getRecentActivity(),
  },

  // Tombstones / Transactions
  tombstones: {
    getAll: () => baseApi.getTombstones(),
    getById: (id: string) => baseApi.getTombstone(id),
    create: (data: Parameters<typeof baseApi.createTombstone>[0]) => baseApi.createTombstone(data),
    update: (id: string, data: Parameters<typeof baseApi.updateTombstone>[1]) => baseApi.updateTombstone(id, data),
    delete: (id: string) => baseApi.deleteTombstone(id),
    publish: (id: string, isPublished: boolean) => baseApi.publishTombstone(id, isPublished),
    reorder: (ids: string[]) => baseApi.reorderTombstones(ids),
  },

  // Blog Posts / News / Resources
  blogPosts: {
    getAll: (category?: string) => baseApi.getBlogPosts(category),
    getNews: () => baseApi.getBlogPosts('news'),
    getResources: () => baseApi.getBlogPosts('resource'),
    getById: (id: string) => baseApi.getBlogPost(id),
    create: (data: Parameters<typeof baseApi.createBlogPost>[0]) => baseApi.createBlogPost(data),
    update: (id: string, data: Parameters<typeof baseApi.updateBlogPost>[1]) => baseApi.updateBlogPost(id, data),
    delete: (id: string) => baseApi.deleteBlogPost(id),
    publish: (id: string, isPublished: boolean) => baseApi.publishBlogPost(id, isPublished),
  },

  // Page Content
  pages: {
    getAll: () => baseApi.getPages(),
    getByKey: (key: string) => baseApi.getPage(key),
    update: (key: string, data: Parameters<typeof baseApi.updatePage>[1]) => baseApi.updatePage(key, data),
  },

  // Analytics
  analytics: {
    getPageViews: (params: Parameters<typeof baseApi.getPageViews>[0]) => baseApi.getPageViews(params),
    getTopPages: (params: Parameters<typeof baseApi.getTopPages>[0]) => baseApi.getTopPages(params),
  },

  // Subscribers
  subscribers: {
    getAll: () => baseApi.getSubscribers(),
    create: (data: Parameters<typeof baseApi.createSubscriber>[0]) => baseApi.createSubscriber(data),
    delete: (id: string) => baseApi.deleteSubscriber(id),
    export: () => baseApi.exportSubscribers(),
    import: (file: File) => baseApi.importSubscribers(file),
  },

  // Seller Intakes
  intakes: {
    getAll: () => baseApi.getIntakes(),
    getById: (id: string) => baseApi.getIntake(id),
    updateStatus: (id: string, data: Parameters<typeof baseApi.updateIntakeStatus>[1]) => baseApi.updateIntakeStatus(id, data),
    export: () => baseApi.exportIntakes(),
  },

  // Email
  email: {
    send: (data: Parameters<typeof baseApi.sendEmail>[0]) => baseApi.sendEmail(data),
    preview: (data: Parameters<typeof baseApi.previewEmail>[0]) => baseApi.previewEmail(data),
    getHistory: () => baseApi.getEmailHistory(),
  },

  // Users (Admin)
  users: {
    getAll: () => baseApi.getUsers(),
    invite: (data: Parameters<typeof baseApi.inviteUser>[0]) => baseApi.inviteUser(data),
    updateRole: (id: string, role: Parameters<typeof baseApi.updateUserRole>[1]) => baseApi.updateUserRole(id, role),
    remove: (id: string) => baseApi.removeUser(id),
  },

  // Static Content - Team Members
  team: {
    getAll: () => baseApi.getTeamMembers(),
    create: (data: Parameters<typeof baseApi.createTeamMember>[0]) => baseApi.createTeamMember(data),
    update: (id: string, data: Parameters<typeof baseApi.updateTeamMember>[1]) => baseApi.updateTeamMember(id, data),
    delete: (id: string) => baseApi.deleteTeamMember(id),
  },

  // Static Content - FAQs
  faqs: {
    getAll: () => baseApi.getFAQs(),
    create: (data: Parameters<typeof baseApi.createFAQ>[0]) => baseApi.createFAQ(data),
    update: (id: string, data: Parameters<typeof baseApi.updateFAQ>[1]) => baseApi.updateFAQ(id, data),
    delete: (id: string) => baseApi.deleteFAQ(id),
  },

  // Static Content - Services
  services: {
    getAll: () => baseApi.getServices(),
    create: (data: Parameters<typeof baseApi.createService>[0]) => baseApi.createService(data),
    update: (id: string, data: Parameters<typeof baseApi.updateService>[1]) => baseApi.updateService(id, data),
    delete: (id: string) => baseApi.deleteService(id),
  },

  // Static Content - Industries
  industries: {
    getAll: () => baseApi.getIndustries(),
    create: (data: Parameters<typeof baseApi.createIndustry>[0]) => baseApi.createIndustry(data),
    update: (id: string, data: Parameters<typeof baseApi.updateIndustry>[1]) => baseApi.updateIndustry(id, data),
    delete: (id: string) => baseApi.deleteIndustry(id),
  },

  // Static Content - Community Services
  community: {
    getAll: () => baseApi.getCommunityServices(),
    create: (data: Parameters<typeof baseApi.createCommunityService>[0]) => baseApi.createCommunityService(data),
    update: (id: string, data: Parameters<typeof baseApi.updateCommunityService>[1]) => baseApi.updateCommunityService(id, data),
    delete: (id: string) => baseApi.deleteCommunityService(id),
  },

  // Static Content - Core Values
  coreValues: {
    getAll: () => baseApi.getCoreValues(),
    create: (data: Parameters<typeof baseApi.createCoreValue>[0]) => baseApi.createCoreValue(data),
    update: (id: string, data: Parameters<typeof baseApi.updateCoreValue>[1]) => baseApi.updateCoreValue(id, data),
    delete: (id: string) => baseApi.deleteCoreValue(id),
  },
};

export type { WebAdminApi } from './types';
