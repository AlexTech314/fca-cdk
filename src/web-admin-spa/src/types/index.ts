// ===========================================
// CORE MODELS (from API schema)
// ===========================================

export interface Tombstone {
  id: string;
  name: string;
  slug: string;
  imagePath: string;
  industry: string | null;
  role: string | null;
  dealDate: string | null;
  description: string | null;
  newsSlug: string | null;
  sortOrder: number;
  isPublished: boolean;
  previewToken: string;
  createdAt: string;
  updatedAt: string;
}

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content: string; // Markdown content (from BlockNote)
  author: string | null;
  category: string | null; // news, resource, article
  publishedAt: string | null;
  isPublished: boolean;
  previewToken: string;
  createdAt: string;
  updatedAt: string;
}

export interface PageContent {
  id: string;
  pageKey: string; // about, faq, contact, etc.
  title: string;
  content: string; // Markdown or JSON
  metadata: Record<string, unknown> | null; // SEO metadata
  previewToken: string;
  updatedAt: string;
}

export interface PageView {
  id: string;
  path: string;
  hour: string; // ISO timestamp truncated to hour
  count: number;
  createdAt: string;
}

export interface EmailSubscriber {
  id: string;
  email: string;
  name: string | null;
  source: string | null; // website, intake_form, manual
  isSubscribed: boolean;
  subscribedAt: string;
  unsubscribedAt: string | null;
}

export interface SellerIntake {
  id: string;
  email: string;
  name: string | null;
  companyName: string | null;
  phone: string | null;
  message: string | null;
  source: string | null;
  status: 'new' | 'contacted' | 'qualified' | 'closed';
  createdAt: string;
  updatedAt: string;
}

export interface EmailNotification {
  id: string;
  type: 'new_tombstone' | 'new_blog_post';
  referenceId: string;
  sentAt: string;
  recipientCount: number;
}

// ===========================================
// USER & AUTH
// ===========================================

export type UserRole = 'readonly' | 'readwrite' | 'admin';

export interface User {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  lastActiveAt: string | null;
  createdAt: string;
}

export type AuthFlow =
  | 'LOGIN'
  | 'NEW_PASSWORD_REQUIRED'
  | 'FORGOT_PASSWORD'
  | 'CONFIRM_RESET_CODE';

export type SignInStep =
  | 'DONE'
  | 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED'
  | 'RESET_PASSWORD';

export interface SignInResult {
  isSignedIn: boolean;
  user?: User;
  nextStep?: SignInStep;
  codeDeliveryDetails?: {
    destination?: string;
    deliveryMedium?: string;
  };
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}

// ===========================================
// INPUT TYPES (for forms)
// ===========================================

export interface CreateTombstoneInput {
  name: string;
  slug?: string; // Auto-generated if not provided
  imagePath: string;
  industry?: string;
  role?: string;
  dealDate?: string;
  description?: string;
  newsSlug?: string;
  sortOrder?: number;
  isPublished?: boolean;
}

export interface UpdateTombstoneInput extends Partial<CreateTombstoneInput> {}

export interface CreateBlogPostInput {
  slug?: string; // Auto-generated from title if not provided
  title: string;
  excerpt?: string;
  content: string; // Markdown
  author?: string;
  category?: string;
  isPublished?: boolean;
}

export interface UpdateBlogPostInput extends Partial<CreateBlogPostInput> {}

export interface UpdatePageContentInput {
  title?: string;
  content?: string;
  metadata?: Record<string, unknown>;
}

export interface CreateSubscriberInput {
  email: string;
  name?: string;
  source?: string;
}

export interface UpdateIntakeStatusInput {
  status: 'new' | 'contacted' | 'qualified' | 'closed';
  notes?: string;
}

export interface SendEmailInput {
  subject: string;
  htmlContent: string;
  recipientFilter?: {
    subscribedOnly?: boolean;
    sources?: string[];
  };
  testEmail?: string; // Send test to this email first
}

// ===========================================
// ANALYTICS TYPES
// ===========================================

export interface DashboardStats {
  totalTombstones: number;
  totalBlogPosts: number;
  totalSubscribers: number;
  intakesThisWeek: number;
}

export interface ActivityItem {
  id: string;
  type: 'tombstone' | 'blog_post' | 'subscriber' | 'intake';
  action: 'created' | 'updated' | 'published' | 'deleted';
  title: string;
  timestamp: string;
}

export interface AnalyticsParams {
  start: string; // ISO date
  end: string; // ISO date
  granularity?: 'hour' | 'day';
}

export interface PageViewData {
  timestamp: string;
  count: number;
}

export interface TopPage {
  path: string;
  views: number;
  title?: string;
}

// ===========================================
// PAGINATED RESPONSE
// ===========================================

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
