# API Backend Plan

**Grounded to:** All contract deliverables (shared backend infrastructure)

This Express.js + Prisma API serves as the shared backend for all three frontend applications: the public website (nextjs-web), the admin dashboard (web-admin-spa), and the lead generation platform (lead-gen-spa).

---

## Contract Deliverables Supported

| Deliverable | API Responsibilities |
|-------------|---------------------|
| Lead Generation Platform ($8,500) | Lead storage, Google Maps integration, AI qualification, export, usage limits |
| Website Modernization ($4,000) | Tombstones, blog posts, page content, analytics tracking |
| Newsletter/Email Capture ($450) | Email subscribers, Resend integration, automated notifications |

---

## Database Schema (Prisma)

### Core Models

```prisma
// ===========================================
// WEBSITE CONTENT (Website Modernization)
// ===========================================

model Tombstone {
  id             String   @id @default(uuid())
  name           String                         // Company/Seller name
  slug           String   @unique               // URL-friendly identifier
  imagePath      String   @map("image_path")    // Path to tombstone image
  industry       String?                        // Industry category
  role           String?                        // Buy-side or Sell-side
  dealDate       DateTime? @map("deal_date")    // When the deal closed
  description    String?                        // Short description
  
  // Extended fields (from CSV data)
  buyerPeFirm    String?  @map("buyer_pe_firm")     // PE firm (e.g., "O2 Capital")
  buyerPlatform  String?  @map("buyer_platform")    // Platform company (e.g., "Straightaway Tire & Auto")
  transactionYear Int?    @map("transaction_year")  // Year of deal (e.g., 2025)
  city           String?                            // City location
  state          String?                            // State code (e.g., "CO", "TX")
  
  // Press release (1-to-1 relationship with BlogPost)
  pressReleaseId String?  @unique @map("press_release_id")
  pressRelease   BlogPost? @relation(fields: [pressReleaseId], references: [id], onDelete: SetNull)
  
  sortOrder      Int      @default(0) @map("sort_order")
  isPublished    Boolean  @default(true) @map("is_published")
  previewToken   String   @unique @default(uuid()) @map("preview_token") // For preview URLs
  createdAt      DateTime @default(now()) @map("created_at")
  updatedAt      DateTime @updatedAt @map("updated_at")
  
  // Many-to-many relationship with content tags
  tags           TombstoneTag[]

  @@map("tombstones")
}

model BlogPost {
  id           String   @id @default(uuid())
  slug         String   @unique
  title        String
  excerpt      String?
  content      String                         // Markdown content (from BlockNote)
  author       String?
  category     String?                        // news, resource, article
  publishedAt  DateTime? @map("published_at")
  isPublished  Boolean  @default(false) @map("is_published")
  previewToken String   @unique @default(uuid()) @map("preview_token") // For preview URLs
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")
  
  // 1-to-1 reverse relation (this blog post is the press release for a tombstone)
  tombstone    Tombstone?
  
  // Many-to-many relationship with content tags
  tags         BlogPostTag[]

  @@index([category, isPublished])
  @@map("blog_posts")
}

// ===========================================
// CONTENT TAGS (for related content discovery)
// ===========================================

model ContentTag {
  id          String   @id @default(uuid())
  name        String   @unique               // Display name (e.g., "Fire & Life Safety")
  slug        String   @unique               // URL-friendly version (e.g., "fire-safety")
  category    String?                        // "industry", "service-type", or "deal-type"
  description String?                        // Optional description for admin UI
  keywords    String[] @default([])          // Keywords for content matching
  createdAt   DateTime @default(now()) @map("created_at")
  
  // Many-to-many relationships
  tombstones  TombstoneTag[]
  blogPosts   BlogPostTag[]

  @@map("content_tags")
}

model TombstoneTag {
  tombstoneId String @map("tombstone_id")
  tagId       String @map("tag_id")
  
  tombstone   Tombstone  @relation(fields: [tombstoneId], references: [id], onDelete: Cascade)
  tag         ContentTag @relation(fields: [tagId], references: [id], onDelete: Cascade)
  
  @@id([tombstoneId, tagId])
  @@index([tagId])
  @@map("tombstone_tags")
}

model BlogPostTag {
  blogPostId String @map("blog_post_id")
  tagId      String @map("tag_id")
  
  blogPost   BlogPost   @relation(fields: [blogPostId], references: [id], onDelete: Cascade)
  tag        ContentTag @relation(fields: [tagId], references: [id], onDelete: Cascade)
  
  @@id([blogPostId, tagId])
  @@index([tagId])
  @@map("blog_post_tags")
}

model PageContent {
  id           String   @id @default(uuid())
  pageKey      String   @unique @map("page_key") // about, faq, contact, etc.
  title        String
  content      String                            // Markdown or JSON
  metadata     Json?                             // SEO metadata, structured data
  previewToken String   @unique @default(uuid()) @map("preview_token") // For preview URLs
  updatedAt    DateTime @updatedAt @map("updated_at")

  @@map("page_content")
}

// ===========================================
// ANALYTICS (Website Modernization)
// ===========================================

model PageView {
  id        String   @id @default(uuid())
  path      String                            // URL path
  hour      DateTime                          // Truncated to hour for aggregation
  count     Int      @default(1)
  createdAt DateTime @default(now()) @map("created_at")

  @@unique([path, hour])
  @@index([hour])
  @@map("page_views")
}

// ===========================================
// EMAIL & NEWSLETTER (Newsletter/Email Capture)
// ===========================================

model EmailSubscriber {
  id           String   @id @default(uuid())
  email        String   @unique
  name         String?
  source       String?                        // website, intake_form, manual
  isSubscribed Boolean  @default(true) @map("is_subscribed")
  subscribedAt DateTime @default(now()) @map("subscribed_at")
  unsubscribedAt DateTime? @map("unsubscribed_at")

  @@map("email_subscribers")
}

model SellerIntake {
  id            String   @id @default(uuid())
  
  // Contact Information
  firstName     String   @map("first_name")
  lastName      String   @map("last_name")
  email         String
  phone         String?
  
  // Company Information
  companyName   String   @map("company_name")
  title         String?                        // Their role (Owner, CEO, CFO, etc.)
  industry      String?                        // Industry category
  city          String?
  state         String?
  
  // Business Details
  revenueRange  String?  @map("revenue_range") // "<$5M", "$5M-$10M", "$10M-$25M", "$25M-$50M", "$50M+"
  employeeCount String?  @map("employee_count") // "1-10", "11-25", "26-50", "51-100", "100+"
  
  // Transaction Interest
  timeline      String?                        // "ASAP", "6-12 months", "1-2 years", "2+ years", "Just exploring"
  serviceInterest String? @map("service_interest") // "sell-side", "buy-side", "strategic-consulting", "valuation"
  
  // Additional
  message       String?
  source        String?                        // Which form/page (contact, cta, etc.)
  referralSource String? @map("referral_source") // How did they hear about us
  
  // Internal Tracking
  status        String   @default("new")       // new, contacted, qualified, engaged, closed
  notes         String?                        // Internal notes (admin only)
  assignedTo    String?  @map("assigned_to")   // Team member handling
  
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")

  @@index([status])
  @@index([createdAt])
  @@map("seller_intakes")
}

model EmailNotification {
  id          String   @id @default(uuid())
  type        String                          // new_tombstone, new_blog_post
  referenceId String   @map("reference_id")   // ID of tombstone or blog post
  sentAt      DateTime @default(now()) @map("sent_at")
  recipientCount Int   @map("recipient_count")

  @@map("email_notifications")
}

// ===========================================
// LEAD GENERATION (Lead Generation Platform)
// ===========================================

model Organization {
  id            String   @id @default(uuid())
  name          String
  usageLimitLeads Int    @default(10000) @map("usage_limit_leads")
  usageLimitExports Int  @default(100) @map("usage_limit_exports")
  createdAt     DateTime @default(now()) @map("created_at")
  
  users         User[]
  leads         Lead[]
  campaigns     Campaign[]
  usageRecords  UsageRecord[]

  @@map("organizations")
}

model User {
  id             String   @id @default(uuid())
  email          String   @unique
  name           String?
  cognitoSub     String?  @unique @map("cognito_sub")
  organizationId String?  @map("organization_id")
  role           String   @default("readonly")  // readonly, readwrite, admin
  invitedAt      DateTime @default(now()) @map("invited_at")
  lastActiveAt   DateTime? @map("last_active_at")
  createdAt      DateTime @default(now()) @map("created_at")
  updatedAt      DateTime @updatedAt @map("updated_at")

  organization   Organization? @relation(fields: [organizationId], references: [id])
  campaignRuns   CampaignRun[]

  @@map("users")
}

// User Roles:
// - readonly: View everything, cannot run campaigns or manage users
// - readwrite: Everything except manage users (can run campaigns, export, qualify)
// - admin: Full access including user management

model Lead {
  id              String   @id @default(uuid())
  placeId         String   @unique @map("place_id")  // Google Maps place_id
  organizationId  String   @map("organization_id")
  campaignId      String?  @map("campaign_id")       // Which campaign created this lead
  campaignRunId   String?  @map("campaign_run_id")   // Which specific run
  
  // Basic Info (from Google Maps)
  name            String
  address         String?
  city            String?
  state           String?
  zipCode         String?  @map("zip_code")
  phone           String?
  website         String?
  
  // Google Maps Data
  rating          Float?
  reviewCount     Int?     @map("review_count")
  priceLevel      Int?     @map("price_level")
  businessType    String?  @map("business_type")
  
  // AI Qualification
  qualificationScore Int?  @map("qualification_score")  // 0-100
  qualificationNotes String? @map("qualification_notes")
  qualifiedAt     DateTime? @map("qualified_at")
  
  // Metadata
  source          String?                              // google_maps, manual
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  organization    Organization @relation(fields: [organizationId], references: [id])
  campaign        Campaign? @relation(fields: [campaignId], references: [id])
  campaignRun     CampaignRun? @relation(fields: [campaignRunId], references: [id])

  @@index([organizationId, state])
  @@index([organizationId, businessType])
  @@index([organizationId, campaignId])
  @@index([qualificationScore])
  @@index([createdAt])
  @@map("leads")
}

model Campaign {
  id             String   @id @default(uuid())
  organizationId String   @map("organization_id")
  name           String
  description    String?
  queries        String[] @default([])              // Array of Google search queries
  createdById    String   @map("created_by_id")
  createdAt      DateTime @default(now()) @map("created_at")
  updatedAt      DateTime @updatedAt @map("updated_at")

  organization   Organization @relation(fields: [organizationId], references: [id])
  runs           CampaignRun[]
  leads          Lead[]

  @@index([organizationId])
  @@map("campaigns")
}

model CampaignRun {
  id             String   @id @default(uuid())
  campaignId     String   @map("campaign_id")
  organizationId String   @map("organization_id")
  startedById    String   @map("started_by_id")
  
  // Status
  status         String   @default("pending")       // pending, running, completed, failed
  startedAt      DateTime @default(now()) @map("started_at")
  completedAt    DateTime? @map("completed_at")
  
  // Metrics
  queriesTotal   Int      @default(0) @map("queries_total")
  queriesExecuted Int     @default(0) @map("queries_executed")
  leadsFound     Int      @default(0) @map("leads_found")
  duplicatesSkipped Int   @default(0) @map("duplicates_skipped")
  errors         Int      @default(0)
  errorMessages  String[] @default([]) @map("error_messages")

  campaign       Campaign @relation(fields: [campaignId], references: [id])
  startedBy      User @relation(fields: [startedById], references: [id])
  leads          Lead[]

  @@index([campaignId])
  @@index([organizationId, startedAt])
  @@map("campaign_runs")
}

model UsageRecord {
  id             String   @id @default(uuid())
  organizationId String   @map("organization_id")
  action         String                               // lead_search, export, ai_qualify
  count          Int      @default(1)
  recordedAt     DateTime @default(now()) @map("recorded_at")

  organization   Organization @relation(fields: [organizationId], references: [id])

  @@index([organizationId, action, recordedAt])
  @@map("usage_records")
}

model SearchQuery {
  id             String   @id @default(uuid())
  organizationId String   @map("organization_id")
  query          String                               // Search query text
  location       String?                              // City, state
  businessType   String?  @map("business_type")
  resultsCount   Int      @map("results_count")
  executedAt     DateTime @default(now()) @map("executed_at")

  @@index([organizationId])
  @@map("search_queries")
}
```

---

## Content Tag Taxonomy

The `ContentTag` model uses a predefined taxonomy to ensure consistent tagging across tombstones and news articles. Tags are organized into three categories:

### Industry Tags

| Slug | Display Name | Description |
|------|--------------|-------------|
| `fire-safety` | Fire & Life Safety | Fire protection, sprinkler systems, alarms |
| `auto-repair` | Auto Repair | Automotive repair, maintenance, tire services |
| `collision-repair` | Collision & Auto Body | Auto body repair, collision, paint |
| `hvac` | HVAC | Heating, ventilation, air conditioning |
| `plumbing` | Plumbing | Plumbing installation and repair |
| `electrical` | Electrical Services | Electrical contracting and supply |
| `environmental` | Environmental Services | Environmental consulting, reclamation |
| `it-technology` | IT & Technology | IT consulting, MSP, software |
| `petroleum` | Petroleum & Lubricants | Petroleum distribution, lubricants |
| `oil-gas` | Oil & Gas | Oil and gas equipment and services |
| `refrigeration` | Refrigeration | Commercial refrigeration systems |
| `pool-spa` | Pool & Spa | Pool and spa services |
| `roofing` | Roofing | Residential and commercial roofing |
| `healthcare` | Healthcare | Healthcare services, pharmacy |
| `advertising` | Advertising & Marketing | Advertising agencies |
| `transportation` | Transportation & Logistics | Trucking, logistics |
| `manufacturing` | Manufacturing | Manufacturing and fabrication |
| `distribution` | Distribution | Wholesale distribution |
| `construction` | Construction & Building | Construction, building trades |
| `retail` | Retail | Retail businesses |
| `engineering` | Engineering | Engineering services |
| `business-services` | Business Services | BPO, professional services |
| `travel-hospitality` | Travel & Hospitality | Travel, hospitality |
| `aerospace-defense` | Aerospace & Defense | Aerospace, defense contractors |

### Service Type Tags

| Slug | Display Name | Description |
|------|--------------|-------------|
| `home-services` | Home Services | Residential home services |
| `commercial-services` | Commercial Services | Commercial and B2B services |

### Deal Type Tags

| Slug | Display Name | Description |
|------|--------------|-------------|
| `acquisition` | Acquisition | Company acquisitions and mergers |
| `private-equity` | Private Equity | PE-backed transactions |
| `platform-add-on` | Platform Add-On | Add-on acquisitions |
| `recapitalization` | Recapitalization | Recaps and equity transactions |

### Database Seeding

On initial deployment, seed the `ContentTag` table with the full taxonomy:

```typescript
// prisma/seed.ts
import { PrismaClient } from '@prisma/client';
import { TAG_TAXONOMY } from '../src/lib/taxonomy';

const prisma = new PrismaClient();

async function main() {
  for (const tag of TAG_TAXONOMY) {
    await prisma.contentTag.upsert({
      where: { slug: tag.slug },
      update: {
        name: tag.name,
        category: tag.category,
        description: tag.description,
        keywords: tag.keywords,
      },
      create: {
        slug: tag.slug,
        name: tag.name,
        category: tag.category,
        description: tag.description,
        keywords: tag.keywords,
      },
    });
  }
}

main();
```

---

## API Endpoints

### Public Website Endpoints (nextjs-web)

```
GET  /api/tombstones                 # List published tombstones
GET  /api/tombstones/:slug           # Get single tombstone (includes press release and tags)
GET  /api/tombstones/:slug/related   # Get related news articles (by matching tags, excludes press release)
GET  /api/blog-posts                 # List published blog posts
GET  /api/blog-posts/:slug           # Get single blog post (includes tags)
GET  /api/blog-posts/:slug/related   # Get related tombstones and articles (by matching tags)
GET  /api/tags                       # List all content tags
GET  /api/tags/:slug                 # Get tag with associated content
GET  /api/pages/:pageKey             # Get page content (about, faq, etc.)
POST /api/analytics/pageview         # Record page view
POST /api/subscribe                  # Newsletter signup
POST /api/seller-intake              # Seller intake form submission
```

### Seller Intake Form Payload

```typescript
// POST /api/seller-intake
interface SellerIntakePayload {
  // Required
  firstName: string;
  lastName: string;
  email: string;
  companyName: string;
  
  // Optional Contact
  phone?: string;
  
  // Optional Company Info
  title?: string;           // Their role (Owner, CEO, CFO, etc.)
  industry?: string;        // Industry slug from taxonomy
  city?: string;
  state?: string;           // 2-letter state code
  
  // Optional Business Details
  revenueRange?: string;    // "<$5M" | "$5M-$10M" | "$10M-$25M" | "$25M-$50M" | "$50M+"
  employeeCount?: string;   // "1-10" | "11-25" | "26-50" | "51-100" | "100+"
  
  // Optional Transaction Interest
  timeline?: string;        // "ASAP" | "6-12 months" | "1-2 years" | "2+ years" | "Just exploring"
  serviceInterest?: string; // "sell-side" | "buy-side" | "strategic-consulting" | "valuation" | "not-sure"
  
  // Optional Additional
  message?: string;
  source?: string;          // Form source: "contact", "cta", "homepage", etc.
  referralSource?: string;  // "google" | "linkedin" | "referral" | "pe-firm" | "attorney" | "conference" | "other"
}

// Response
interface SellerIntakeResponse {
  success: boolean;
  message: string;
  id: string;  // UUID of created record
}
```

### Preview Endpoints (nextjs-web preview routes)

```
GET  /api/preview/tombstones/:slug?token=xxx   # Get tombstone by preview token (any publish state)
GET  /api/preview/blog-posts/:slug?token=xxx   # Get blog post by preview token (any publish state)
GET  /api/preview/pages/:pageKey?token=xxx     # Get page content by preview token
```

Preview endpoints:
- Validate the `token` query param matches the record's `previewToken`
- Return content regardless of `isPublished` status
- Rate limited to prevent brute force

### Admin Dashboard Endpoints (web-admin-spa)

```
# Content Management
GET    /api/admin/tombstones         # List all tombstones (including unpublished)
POST   /api/admin/tombstones         # Create tombstone
PUT    /api/admin/tombstones/:id     # Update tombstone
DELETE /api/admin/tombstones/:id     # Delete tombstone
POST   /api/admin/tombstones/:id/publish   # Publish/unpublish

# Tombstone Press Release & Tags
PUT    /api/admin/tombstones/:id/press-release   # Set press release (blogPostId or null)
GET    /api/admin/tombstones/:id/tags            # Get tags for tombstone
PUT    /api/admin/tombstones/:id/tags            # Update tags (array of tagIds)

GET    /api/admin/blog-posts         # List all blog posts
POST   /api/admin/blog-posts         # Create blog post
PUT    /api/admin/blog-posts/:id     # Update blog post
DELETE /api/admin/blog-posts/:id     # Delete blog post
POST   /api/admin/blog-posts/:id/publish   # Publish/unpublish

# Blog Post Tags
GET    /api/admin/blog-posts/:id/tags      # Get tags for blog post
PUT    /api/admin/blog-posts/:id/tags      # Update tags (array of tagIds)

# Content Tags Management
GET    /api/admin/tags               # List all content tags
POST   /api/admin/tags               # Create tag
PUT    /api/admin/tags/:id           # Update tag
DELETE /api/admin/tags/:id           # Delete tag

GET    /api/admin/pages              # List page content
PUT    /api/admin/pages/:pageKey     # Update page content

# Email Management
GET    /api/admin/subscribers        # List email subscribers
POST   /api/admin/subscribers        # Add subscriber manually
DELETE /api/admin/subscribers/:id    # Remove subscriber
POST   /api/admin/email/send         # Send email to subscribers (via Resend)

# Analytics
GET    /api/admin/analytics/pageviews       # Get page view stats
GET    /api/admin/analytics/top-pages       # Get top pages
GET    /api/admin/analytics/trends          # Get hourly/daily trends

# Seller Intakes
GET    /api/admin/seller-intakes            # List intake submissions
PUT    /api/admin/seller-intakes/:id        # Update status
```

### Lead Generation Endpoints (lead-gen-spa)

```
# Dashboard Analytics
GET    /api/leadgen/dashboard/stats                    # Total leads, campaigns, qualified, exports
GET    /api/leadgen/dashboard/leads-over-time          # Line chart data (hourly granularity)
GET    /api/leadgen/dashboard/campaigns-over-time      # Line chart data (hourly granularity)
GET    /api/leadgen/dashboard/business-type-distribution  # Pie chart data
GET    /api/leadgen/dashboard/location-distribution    # Pie chart data

# Leads (server-side filtering & pagination)
GET    /api/leadgen/leads                    # List leads with filters, pagination, sorting
GET    /api/leadgen/leads/:id                # Get single lead (includes campaign info)
GET    /api/leadgen/leads/count              # Count leads matching filters
POST   /api/leadgen/leads/:id/qualify        # Run AI qualification on lead
POST   /api/leadgen/leads/qualify-bulk       # AI qualify multiple leads
POST   /api/leadgen/leads/export             # Export leads to CSV

# Campaigns
GET    /api/leadgen/campaigns                # List campaigns
GET    /api/leadgen/campaigns/:id            # Get campaign with query list
POST   /api/leadgen/campaigns                # Create campaign
PUT    /api/leadgen/campaigns/:id            # Update campaign
DELETE /api/leadgen/campaigns/:id            # Delete campaign

# Campaign Runs
GET    /api/leadgen/campaigns/:id/runs       # List runs for campaign (paginated)
POST   /api/leadgen/campaigns/:id/run        # Start a new run (requires readwrite or admin)
GET    /api/leadgen/runs/:id                 # Get run details with metrics

# User Management (admin only)
GET    /api/leadgen/users                    # List users in organization
POST   /api/leadgen/users/invite             # Invite new user (sends Cognito invite)
PUT    /api/leadgen/users/:id/role           # Change user role
DELETE /api/leadgen/users/:id                # Remove user from organization

# Usage & Limits
GET    /api/leadgen/usage                    # Get usage stats for current org
GET    /api/leadgen/usage/limits             # Get usage limits
```

### Lead Filtering (Server-Side)

All lead filtering happens in the API, not the client:

```typescript
// GET /api/leadgen/leads?page=1&limit=25&sort=createdAt&order=desc&filters={...}

interface LeadQueryParams {
  page: number;
  limit: number;
  sort: string;           // Column to sort by
  order: 'asc' | 'desc';
  filters: {
    name?: string;              // ILIKE '%name%'
    city?: string;              // ILIKE '%city%'
    states?: string[];          // WHERE state IN (...)
    businessTypes?: string[];   // WHERE business_type IN (...)
    campaignId?: string;        // WHERE campaign_id = ...
    ratingMin?: number;         // WHERE rating >= ...
    ratingMax?: number;         // WHERE rating <= ...
    qualificationMin?: number;
    qualificationMax?: number;
    hasWebsite?: boolean;       // WHERE website IS NOT NULL
    hasPhone?: boolean;         // WHERE phone IS NOT NULL
  };
}

// Response
interface PaginatedLeadsResponse {
  data: Lead[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
```

---

## External Service Integrations

### 1. Google Maps API (Lead Generation)

```typescript
// Integration: Google Places Text Search API
// Used for: Finding business leads by query

interface GoogleMapsService {
  searchPlaces(query: string, location?: string): Promise<PlaceResult[]>;
  getPlaceDetails(placeId: string): Promise<PlaceDetails>;
}
```

**Cost**: ~$85 per 100,000 raw leads (as per contract)

### 2. Claude API (Lead Generation)

```typescript
// Integration: Claude for AI qualification
// Used for: Scoring and qualifying leads based on methodology

interface ClaudeService {
  qualifyLead(lead: Lead): Promise<{
    score: number;        // 0-100
    notes: string;        // Qualification reasoning
  }>;
}
```

**Cost**: Variable, typically $10-50/month (as per contract)

### 3. Resend API (Newsletter/Email)

```typescript
// Integration: Resend for email delivery
// Used for: Newsletter, notifications, automated emails

interface ResendService {
  sendEmail(to: string[], subject: string, html: string): Promise<void>;
  sendBatch(emails: BatchEmail[]): Promise<void>;
}
```

---

## Authentication Strategy

### AWS Cognito via Amplify

- **Public endpoints**: No auth required (website content, analytics tracking)
- **Admin endpoints**: Require valid Cognito JWT with admin role
- **Lead gen endpoints**: Require valid Cognito JWT with organization membership + role check

```typescript
// Middleware: auth.ts
interface AuthMiddleware {
  requireAuth(): RequestHandler;           // Any authenticated user
  requireWebAdmin(): RequestHandler;       // Web admin role (for web-admin-spa)
  requireLeadGenRole(minRole: 'readonly' | 'readwrite' | 'admin'): RequestHandler;
}

// Role hierarchy for lead-gen-spa:
// readonly < readwrite < admin
// 
// Example usage:
// router.get('/leads', requireLeadGenRole('readonly'), getLeads);      // All roles can view
// router.post('/campaigns/:id/run', requireLeadGenRole('readwrite'), runCampaign);  // readwrite + admin
// router.post('/users/invite', requireLeadGenRole('admin'), inviteUser);  // admin only
```

---

## Content Preview System

### Overview

Admin users can preview unpublished content via secure preview URLs. The preview system uses permanent tokens stored with each content record.

```mermaid
sequenceDiagram
    participant Admin as web-admin-spa
    participant API as Express API
    participant NextJS as nextjs-web
    
    Admin->>API: Create/Edit content
    API-->>Admin: { slug, previewToken, isPublished: false }
    Admin->>NextJS: iframe src="/preview/blog/slug?token=xxx"
    NextJS->>API: GET /api/preview/blog-posts/slug?token=xxx
    API->>API: Validate token matches record
    API-->>NextJS: Content (regardless of isPublished)
    NextJS-->>Admin: Rendered preview in iframe
```

### Security Layers

| Layer | Protection |
|-------|------------|
| **Unguessable tokens** | UUID v4 (122 bits entropy) - impossible to brute force |
| **Token validation** | API validates token matches the specific content record |
| **Rate limiting** | Preview endpoints rate limited (e.g., 10 req/min per IP) |
| **No indexing** | Preview routes return `noindex, nofollow` |
| **Iframe-only** | Preview routes check `Sec-Fetch-Dest: iframe` header |

### Token Lifecycle

1. **Created**: When content is first created, `previewToken` is auto-generated (UUID)
2. **Stable**: Token remains the same during edits (preview URL doesn't change)
3. **Optional regeneration**: On publish, can regenerate token for next draft cycle

### API Implementation

```typescript
// Preview endpoint example
app.get('/api/preview/blog-posts/:slug', rateLimit({ max: 10 }), async (req, res) => {
  const { slug } = req.params;
  const { token } = req.query;
  
  if (!token) {
    return res.status(401).json({ error: 'Preview token required' });
  }
  
  const post = await prisma.blogPost.findUnique({
    where: { slug },
  });
  
  if (!post || post.previewToken !== token) {
    return res.status(404).json({ error: 'Not found or invalid token' });
  }
  
  // Return content regardless of isPublished
  return res.json(post);
});
```

---

## Implementation Checklist

### Phase 1: Database & Core API
- [ ] Extend Prisma schema with all models
- [ ] Run migrations
- [ ] Implement repository layer for each model
- [ ] Implement service layer with business logic
- [ ] Add route handlers

### Phase 2: Website Support
- [ ] Public content endpoints (tombstones, blog, pages)
- [ ] Preview endpoints with token validation
- [ ] Rate limiting on preview endpoints
- [ ] Analytics tracking endpoint
- [ ] Newsletter subscription endpoint
- [ ] Seller intake endpoint

### Phase 3: Admin Dashboard Support
- [ ] Content management CRUD endpoints
- [ ] Email management endpoints (Resend integration)
- [ ] Analytics aggregation endpoints
- [ ] Seller intake management

### Phase 4: Lead Generation Support
- [ ] Google Maps API integration
- [ ] Lead storage and retrieval with filters
- [ ] Claude API integration for qualification
- [ ] Export functionality
- [ ] Usage tracking and limits

---

## Infrastructure Notes

As per contract ongoing costs:
- **RDS Postgres**: ~$15-40/month
- **ECS Fargate (API)**: ~$10-25/month
- **Claude API**: Variable, ~$10-50/month
- **Google search fees**: ~$85 per 100,000 raw leads
