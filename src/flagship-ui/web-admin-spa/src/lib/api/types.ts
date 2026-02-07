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

// Static content types
export interface TeamMember {
  id: string;
  name: string;
  title: string;
  bio: string;
  imageUrl: string;
  linkedinUrl?: string;
  email?: string;
  displayOrder: number;
  isActive: boolean;
}

export interface FAQ {
  id: string;
  question: string;
  answer: string;
  category?: string;
  displayOrder: number;
  isActive: boolean;
}

export interface ServiceOffering {
  id: string;
  name: string;
  slug: string;
  description: string;
  shortDescription?: string;
  iconName?: string;
  displayOrder: number;
  isActive: boolean;
}

export interface IndustrySector {
  id: string;
  name: string;
  slug: string;
  description: string;
  shortDescription?: string;
  iconName?: string;
  displayOrder: number;
  isActive: boolean;
}

export interface CommunityService {
  id: string;
  name: string;
  description: string;
  imageUrl?: string;
  websiteUrl?: string;
  displayOrder: number;
  isActive: boolean;
}

export interface CoreValue {
  id: string;
  title: string;
  description: string;
  iconName?: string;
  displayOrder: number;
  isActive: boolean;
}

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
  getBlogPosts(category?: string): Promise<BlogPost[]>;
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

  // Static Content - Team
  getTeamMembers(): Promise<TeamMember[]>;
  createTeamMember(data: Partial<TeamMember>): Promise<TeamMember>;
  updateTeamMember(id: string, data: Partial<TeamMember>): Promise<TeamMember>;
  deleteTeamMember(id: string): Promise<void>;

  // Static Content - FAQ
  getFAQs(): Promise<FAQ[]>;
  createFAQ(data: Partial<FAQ>): Promise<FAQ>;
  updateFAQ(id: string, data: Partial<FAQ>): Promise<FAQ>;
  deleteFAQ(id: string): Promise<void>;

  // Static Content - Services
  getServices(): Promise<ServiceOffering[]>;
  createService(data: Partial<ServiceOffering>): Promise<ServiceOffering>;
  updateService(id: string, data: Partial<ServiceOffering>): Promise<ServiceOffering>;
  deleteService(id: string): Promise<void>;

  // Static Content - Industries
  getIndustries(): Promise<IndustrySector[]>;
  createIndustry(data: Partial<IndustrySector>): Promise<IndustrySector>;
  updateIndustry(id: string, data: Partial<IndustrySector>): Promise<IndustrySector>;
  deleteIndustry(id: string): Promise<void>;

  // Static Content - Community
  getCommunityServices(): Promise<CommunityService[]>;
  createCommunityService(data: Partial<CommunityService>): Promise<CommunityService>;
  updateCommunityService(id: string, data: Partial<CommunityService>): Promise<CommunityService>;
  deleteCommunityService(id: string): Promise<void>;

  // Static Content - Core Values
  getCoreValues(): Promise<CoreValue[]>;
  createCoreValue(data: Partial<CoreValue>): Promise<CoreValue>;
  updateCoreValue(id: string, data: Partial<CoreValue>): Promise<CoreValue>;
  deleteCoreValue(id: string): Promise<void>;
}
