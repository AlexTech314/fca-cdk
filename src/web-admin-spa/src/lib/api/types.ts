import type {
  Tombstone,
  BlogPost,
  PageContent,
  EmailSubscriber,
  SellerIntake,
  EmailNotification,
  User,
  UserRole,
  InviteUserInput,
  DashboardStats,
  ActivityItem,
  AnalyticsParams,
  PageViewData,
  TopPage,
  CreateTombstoneInput,
  UpdateTombstoneInput,
  CreateBlogPostInput,
  UpdateBlogPostInput,
  UpdatePageContentInput,
  CreateSubscriberInput,
  UpdateIntakeStatusInput,
  SendEmailInput,
} from '@/types';

export interface WebAdminApi {
  // Dashboard
  getDashboardStats(): Promise<DashboardStats>;
  getRecentActivity(): Promise<ActivityItem[]>;

  // Tombstones
  getTombstones(): Promise<Tombstone[]>;
  getTombstone(id: string): Promise<Tombstone>;
  createTombstone(input: CreateTombstoneInput): Promise<Tombstone>;
  updateTombstone(id: string, input: UpdateTombstoneInput): Promise<Tombstone>;
  deleteTombstone(id: string): Promise<void>;
  publishTombstone(id: string, isPublished: boolean): Promise<Tombstone>;
  reorderTombstones(ids: string[]): Promise<void>;

  // Blog Posts
  getBlogPosts(): Promise<BlogPost[]>;
  getBlogPost(id: string): Promise<BlogPost>;
  createBlogPost(input: CreateBlogPostInput): Promise<BlogPost>;
  updateBlogPost(id: string, input: UpdateBlogPostInput): Promise<BlogPost>;
  deleteBlogPost(id: string): Promise<void>;
  publishBlogPost(id: string, isPublished: boolean): Promise<BlogPost>;

  // Page Content
  getPages(): Promise<PageContent[]>;
  getPage(pageKey: string): Promise<PageContent>;
  updatePage(pageKey: string, input: UpdatePageContentInput): Promise<PageContent>;

  // Analytics
  getPageViews(params: AnalyticsParams): Promise<PageViewData[]>;
  getTopPages(params: AnalyticsParams & { limit?: number }): Promise<TopPage[]>;

  // Subscribers
  getSubscribers(): Promise<EmailSubscriber[]>;
  createSubscriber(input: CreateSubscriberInput): Promise<EmailSubscriber>;
  deleteSubscriber(id: string): Promise<void>;
  exportSubscribers(): Promise<Blob>;
  importSubscribers(file: File): Promise<{ imported: number; skipped: number }>;

  // Seller Intakes
  getIntakes(): Promise<SellerIntake[]>;
  getIntake(id: string): Promise<SellerIntake>;
  updateIntakeStatus(id: string, input: UpdateIntakeStatusInput): Promise<SellerIntake>;
  exportIntakes(): Promise<Blob>;

  // Email
  sendEmail(input: SendEmailInput): Promise<{ sent: number }>;
  previewEmail(input: SendEmailInput): Promise<{ html: string }>;
  getEmailHistory(): Promise<EmailNotification[]>;

  // Users (Admin)
  getUsers(): Promise<User[]>;
  inviteUser(input: InviteUserInput): Promise<User>;
  updateUserRole(id: string, role: UserRole): Promise<User>;
  removeUser(id: string): Promise<void>;
}
