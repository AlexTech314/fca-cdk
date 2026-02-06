import type {
  WebAdminApi,
  TeamMember,
  FAQ,
  ServiceOffering,
  IndustrySector,
  CommunityService,
  CoreValue,
} from './types';
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
  User,
  UserRole,
  InviteUserInput,
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

// Static content mock data
let teamMembers: TeamMember[] = [
  {
    id: 'team-1',
    name: 'John Smith',
    title: 'Managing Partner',
    bio: 'John has over 20 years of experience in M&A advisory.',
    imageUrl: '/images/team/john-smith.jpg',
    linkedinUrl: 'https://linkedin.com/in/johnsmith',
    email: 'john@flatironscapital.com',
    displayOrder: 1,
    isActive: true,
  },
  {
    id: 'team-2',
    name: 'Jane Doe',
    title: 'Partner',
    bio: 'Jane specializes in healthcare and technology transactions.',
    imageUrl: '/images/team/jane-doe.jpg',
    linkedinUrl: 'https://linkedin.com/in/janedoe',
    email: 'jane@flatironscapital.com',
    displayOrder: 2,
    isActive: true,
  },
];

let faqs: FAQ[] = [
  {
    id: 'faq-1',
    question: 'What is the typical M&A process timeline?',
    answer: 'A typical M&A transaction takes 6-12 months from initial engagement to closing.',
    category: 'Process',
    displayOrder: 1,
    isActive: true,
  },
  {
    id: 'faq-2',
    question: 'How do you determine business valuation?',
    answer: 'We use multiple valuation methodologies including comparable transactions, discounted cash flow, and market multiples.',
    category: 'Valuation',
    displayOrder: 2,
    isActive: true,
  },
];

let services: ServiceOffering[] = [
  {
    id: 'service-1',
    name: 'Sell-Side Advisory',
    slug: 'sell-side-advisory',
    description: 'Comprehensive support for business owners looking to sell their company.',
    shortDescription: 'Full-service M&A representation for sellers',
    iconName: 'TrendingUp',
    displayOrder: 1,
    isActive: true,
  },
  {
    id: 'service-2',
    name: 'Buy-Side Advisory',
    slug: 'buy-side-advisory',
    description: 'Strategic acquisition support for buyers seeking growth opportunities.',
    shortDescription: 'Acquisition search and execution support',
    iconName: 'Search',
    displayOrder: 2,
    isActive: true,
  },
];

let industries: IndustrySector[] = [
  {
    id: 'industry-1',
    name: 'Healthcare Services',
    slug: 'healthcare-services',
    description: 'M&A advisory for healthcare providers and service companies.',
    shortDescription: 'Healthcare sector expertise',
    iconName: 'Stethoscope',
    displayOrder: 1,
    isActive: true,
  },
  {
    id: 'industry-2',
    name: 'Technology',
    slug: 'technology',
    description: 'Technology-focused M&A transactions and valuations.',
    shortDescription: 'Tech sector transactions',
    iconName: 'Cpu',
    displayOrder: 2,
    isActive: true,
  },
];

let communityServices: CommunityService[] = [
  {
    id: 'community-1',
    name: 'Local Food Bank',
    description: 'Supporting hunger relief in the Boulder community.',
    imageUrl: '/images/community/food-bank.png',
    websiteUrl: 'https://boulderfoodbank.org',
    displayOrder: 1,
    isActive: true,
  },
];

let coreValues: CoreValue[] = [
  {
    id: 'value-1',
    title: 'Integrity',
    description: 'We act with honesty and transparency in all our dealings.',
    iconName: 'Shield',
    displayOrder: 1,
    isActive: true,
  },
  {
    id: 'value-2',
    title: 'Excellence',
    description: 'We strive for the highest standards in everything we do.',
    iconName: 'Star',
    displayOrder: 2,
    isActive: true,
  },
];

// Mock users
let users: User[] = [
  {
    id: 'user-1',
    email: 'admin@flatironscapital.com',
    name: 'Admin User',
    role: 'admin',
    lastActiveAt: new Date().toISOString(),
    createdAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'user-2',
    email: 'john.smith@flatironscapital.com',
    name: 'John Smith',
    role: 'readwrite',
    lastActiveAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'user-3',
    email: 'jane.doe@flatironscapital.com',
    name: 'Jane Doe',
    role: 'readwrite',
    lastActiveAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'user-4',
    email: 'viewer@flatironscapital.com',
    name: 'View Only',
    role: 'readonly',
    lastActiveAt: null,
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

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
  async getBlogPosts(category?: string) {
    await delay(200);
    let filtered = [...blogPosts];
    if (category) {
      filtered = filtered.filter((p) => p.category === category);
    }
    return filtered.sort((a, b) => 
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

  // Users (Admin)
  async getUsers() {
    await delay(200);
    return [...users].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  },

  async inviteUser(input: InviteUserInput) {
    await delay(300);
    const now = new Date().toISOString();
    const newUser: User = {
      id: `user-${generateId()}`,
      email: input.email,
      name: input.name || null,
      role: input.role,
      lastActiveAt: null,
      createdAt: now,
    };
    users.push(newUser);
    return newUser;
  },

  async updateUserRole(id: string, role: UserRole) {
    await delay(200);
    const index = users.findIndex(u => u.id === id);
    if (index === -1) throw new Error('User not found');
    
    users[index] = {
      ...users[index],
      role,
    };
    return users[index];
  },

  async removeUser(id: string) {
    await delay(200);
    users = users.filter(u => u.id !== id);
  },

  // ============================================
  // STATIC CONTENT - TEAM MEMBERS
  // ============================================

  async getTeamMembers() {
    await delay(200);
    return [...teamMembers].sort((a, b) => a.displayOrder - b.displayOrder);
  },

  async createTeamMember(data: Partial<TeamMember>) {
    await delay(300);
    const newMember: TeamMember = {
      id: `team-${generateId()}`,
      name: data.name || '',
      title: data.title || '',
      bio: data.bio || '',
      imageUrl: data.imageUrl || '',
      linkedinUrl: data.linkedinUrl,
      email: data.email,
      displayOrder: data.displayOrder ?? teamMembers.length + 1,
      isActive: data.isActive ?? true,
    };
    teamMembers.push(newMember);
    return newMember;
  },

  async updateTeamMember(id: string, data: Partial<TeamMember>) {
    await delay(200);
    const index = teamMembers.findIndex(m => m.id === id);
    if (index === -1) throw new Error('Team member not found');
    teamMembers[index] = { ...teamMembers[index], ...data };
    return teamMembers[index];
  },

  async deleteTeamMember(id: string) {
    await delay(200);
    teamMembers = teamMembers.filter(m => m.id !== id);
  },

  // ============================================
  // STATIC CONTENT - FAQs
  // ============================================

  async getFAQs() {
    await delay(200);
    return [...faqs].sort((a, b) => a.displayOrder - b.displayOrder);
  },

  async createFAQ(data: Partial<FAQ>) {
    await delay(300);
    const newFaq: FAQ = {
      id: `faq-${generateId()}`,
      question: data.question || '',
      answer: data.answer || '',
      category: data.category,
      displayOrder: data.displayOrder ?? faqs.length + 1,
      isActive: data.isActive ?? true,
    };
    faqs.push(newFaq);
    return newFaq;
  },

  async updateFAQ(id: string, data: Partial<FAQ>) {
    await delay(200);
    const index = faqs.findIndex(f => f.id === id);
    if (index === -1) throw new Error('FAQ not found');
    faqs[index] = { ...faqs[index], ...data };
    return faqs[index];
  },

  async deleteFAQ(id: string) {
    await delay(200);
    faqs = faqs.filter(f => f.id !== id);
  },

  // ============================================
  // STATIC CONTENT - SERVICES
  // ============================================

  async getServices() {
    await delay(200);
    return [...services].sort((a, b) => a.displayOrder - b.displayOrder);
  },

  async createService(data: Partial<ServiceOffering>) {
    await delay(300);
    const newService: ServiceOffering = {
      id: `service-${generateId()}`,
      name: data.name || '',
      slug: data.slug || slugify(data.name || ''),
      description: data.description || '',
      shortDescription: data.shortDescription,
      iconName: data.iconName,
      displayOrder: data.displayOrder ?? services.length + 1,
      isActive: data.isActive ?? true,
    };
    services.push(newService);
    return newService;
  },

  async updateService(id: string, data: Partial<ServiceOffering>) {
    await delay(200);
    const index = services.findIndex(s => s.id === id);
    if (index === -1) throw new Error('Service not found');
    services[index] = { ...services[index], ...data };
    return services[index];
  },

  async deleteService(id: string) {
    await delay(200);
    services = services.filter(s => s.id !== id);
  },

  // ============================================
  // STATIC CONTENT - INDUSTRIES
  // ============================================

  async getIndustries() {
    await delay(200);
    return [...industries].sort((a, b) => a.displayOrder - b.displayOrder);
  },

  async createIndustry(data: Partial<IndustrySector>) {
    await delay(300);
    const newIndustry: IndustrySector = {
      id: `industry-${generateId()}`,
      name: data.name || '',
      slug: data.slug || slugify(data.name || ''),
      description: data.description || '',
      shortDescription: data.shortDescription,
      iconName: data.iconName,
      displayOrder: data.displayOrder ?? industries.length + 1,
      isActive: data.isActive ?? true,
    };
    industries.push(newIndustry);
    return newIndustry;
  },

  async updateIndustry(id: string, data: Partial<IndustrySector>) {
    await delay(200);
    const index = industries.findIndex(i => i.id === id);
    if (index === -1) throw new Error('Industry not found');
    industries[index] = { ...industries[index], ...data };
    return industries[index];
  },

  async deleteIndustry(id: string) {
    await delay(200);
    industries = industries.filter(i => i.id !== id);
  },

  // ============================================
  // STATIC CONTENT - COMMUNITY SERVICES
  // ============================================

  async getCommunityServices() {
    await delay(200);
    return [...communityServices].sort((a, b) => a.displayOrder - b.displayOrder);
  },

  async createCommunityService(data: Partial<CommunityService>) {
    await delay(300);
    const newService: CommunityService = {
      id: `community-${generateId()}`,
      name: data.name || '',
      description: data.description || '',
      imageUrl: data.imageUrl,
      websiteUrl: data.websiteUrl,
      displayOrder: data.displayOrder ?? communityServices.length + 1,
      isActive: data.isActive ?? true,
    };
    communityServices.push(newService);
    return newService;
  },

  async updateCommunityService(id: string, data: Partial<CommunityService>) {
    await delay(200);
    const index = communityServices.findIndex(c => c.id === id);
    if (index === -1) throw new Error('Community service not found');
    communityServices[index] = { ...communityServices[index], ...data };
    return communityServices[index];
  },

  async deleteCommunityService(id: string) {
    await delay(200);
    communityServices = communityServices.filter(c => c.id !== id);
  },

  // ============================================
  // STATIC CONTENT - CORE VALUES
  // ============================================

  async getCoreValues() {
    await delay(200);
    return [...coreValues].sort((a, b) => a.displayOrder - b.displayOrder);
  },

  async createCoreValue(data: Partial<CoreValue>) {
    await delay(300);
    const newValue: CoreValue = {
      id: `value-${generateId()}`,
      title: data.title || '',
      description: data.description || '',
      iconName: data.iconName,
      displayOrder: data.displayOrder ?? coreValues.length + 1,
      isActive: data.isActive ?? true,
    };
    coreValues.push(newValue);
    return newValue;
  },

  async updateCoreValue(id: string, data: Partial<CoreValue>) {
    await delay(200);
    const index = coreValues.findIndex(v => v.id === id);
    if (index === -1) throw new Error('Core value not found');
    coreValues[index] = { ...coreValues[index], ...data };
    return coreValues[index];
  },

  async deleteCoreValue(id: string) {
    await delay(200);
    coreValues = coreValues.filter(v => v.id !== id);
  },
};
