import type {
  Tombstone,
  BlogPost,
  PageContent,
  EmailSubscriber,
  SellerIntake,
  EmailNotification,
  ActivityItem,
  User,
} from '@/types';
import { generateId } from './utils';

// Helper to generate dates
const daysAgo = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
};

const hoursAgo = (hours: number) => {
  const date = new Date();
  date.setHours(date.getHours() - hours);
  return date.toISOString();
};

// ===========================================
// MOCK USER
// ===========================================

export const mockUser: User = {
  id: 'user-1',
  email: 'admin@flatironscapital.com',
  name: 'John Smith',
  role: 'admin',
  lastActiveAt: new Date().toISOString(),
  createdAt: daysAgo(365),
};

// ===========================================
// TOMBSTONES
// ===========================================

export const mockTombstones: Tombstone[] = [
  {
    id: 'tomb-1',
    name: 'Precision Manufacturing Co.',
    slug: 'precision-manufacturing-co',
    imagePath: '/tombstones/precision-mfg.jpg',
    industry: 'Manufacturing',
    role: 'Sell-Side',
    dealDate: '2024-11-15',
    description: 'Advised on the sale of a precision machining company to a strategic acquirer.',
    newsSlug: null,
    sortOrder: 1,
    isPublished: true,
    previewToken: generateId(),
    createdAt: daysAgo(30),
    updatedAt: daysAgo(2),
  },
  {
    id: 'tomb-2',
    name: 'HealthFirst Medical Group',
    slug: 'healthfirst-medical-group',
    imagePath: '/tombstones/healthfirst.jpg',
    industry: 'Healthcare',
    role: 'Sell-Side',
    dealDate: '2024-10-20',
    description: 'Represented multi-location physician practice in sale to private equity.',
    newsSlug: 'healthfirst-acquisition-announced',
    sortOrder: 2,
    isPublished: true,
    previewToken: generateId(),
    createdAt: daysAgo(45),
    updatedAt: daysAgo(5),
  },
  {
    id: 'tomb-3',
    name: 'TechFlow Solutions',
    slug: 'techflow-solutions',
    imagePath: '/tombstones/techflow.jpg',
    industry: 'Technology',
    role: 'Buy-Side',
    dealDate: '2024-09-10',
    description: 'Advised strategic buyer on acquisition of SaaS platform.',
    newsSlug: null,
    sortOrder: 3,
    isPublished: true,
    previewToken: generateId(),
    createdAt: daysAgo(60),
    updatedAt: daysAgo(10),
  },
  {
    id: 'tomb-4',
    name: 'Summit Legal Partners',
    slug: 'summit-legal-partners',
    imagePath: '/tombstones/summit-legal.jpg',
    industry: 'Professional Services',
    role: 'Sell-Side',
    dealDate: '2024-08-25',
    description: 'Advised on merger of regional law firms.',
    newsSlug: null,
    sortOrder: 4,
    isPublished: true,
    previewToken: generateId(),
    createdAt: daysAgo(90),
    updatedAt: daysAgo(15),
  },
  {
    id: 'tomb-5',
    name: 'GreenLeaf Packaging',
    slug: 'greenleaf-packaging',
    imagePath: '/tombstones/greenleaf.jpg',
    industry: 'Manufacturing',
    role: 'Sell-Side',
    dealDate: '2024-07-15',
    description: 'Represented sustainable packaging manufacturer in strategic sale.',
    newsSlug: null,
    sortOrder: 5,
    isPublished: true,
    previewToken: generateId(),
    createdAt: daysAgo(120),
    updatedAt: daysAgo(20),
  },
  {
    id: 'tomb-6',
    name: 'DataCore Analytics',
    slug: 'datacore-analytics',
    imagePath: '/tombstones/datacore.jpg',
    industry: 'Technology',
    role: 'Sell-Side',
    dealDate: '2024-06-01',
    description: 'Advised data analytics firm on sale to growth equity investor.',
    newsSlug: null,
    sortOrder: 6,
    isPublished: true,
    previewToken: generateId(),
    createdAt: daysAgo(150),
    updatedAt: daysAgo(25),
  },
  {
    id: 'tomb-7',
    name: 'Alpine Construction',
    slug: 'alpine-construction',
    imagePath: '/tombstones/alpine.jpg',
    industry: 'Construction',
    role: 'Buy-Side',
    dealDate: '2024-05-10',
    description: 'Advised PE-backed platform on add-on acquisition.',
    newsSlug: null,
    sortOrder: 7,
    isPublished: true,
    previewToken: generateId(),
    createdAt: daysAgo(180),
    updatedAt: daysAgo(30),
  },
  {
    id: 'tomb-8',
    name: 'CareFirst Senior Living',
    slug: 'carefirst-senior-living',
    imagePath: '/tombstones/carefirst.jpg',
    industry: 'Healthcare',
    role: 'Sell-Side',
    dealDate: '2024-04-20',
    description: 'Represented assisted living facility operator in sale.',
    newsSlug: null,
    sortOrder: 8,
    isPublished: true,
    previewToken: generateId(),
    createdAt: daysAgo(210),
    updatedAt: daysAgo(35),
  },
  {
    id: 'tomb-9',
    name: 'Metro Distribution',
    slug: 'metro-distribution',
    imagePath: '/tombstones/metro.jpg',
    industry: 'Distribution',
    role: 'Sell-Side',
    dealDate: '2024-03-15',
    description: 'Advised regional distribution company on strategic sale.',
    newsSlug: null,
    sortOrder: 9,
    isPublished: true,
    previewToken: generateId(),
    createdAt: daysAgo(240),
    updatedAt: daysAgo(40),
  },
  {
    id: 'tomb-10',
    name: 'CloudSecure Inc.',
    slug: 'cloudsecure-inc',
    imagePath: '/tombstones/cloudsecure.jpg',
    industry: 'Technology',
    role: 'Sell-Side',
    dealDate: '2024-02-01',
    description: 'Represented cybersecurity SaaS company in growth equity raise.',
    newsSlug: null,
    sortOrder: 10,
    isPublished: true,
    previewToken: generateId(),
    createdAt: daysAgo(270),
    updatedAt: daysAgo(45),
  },
  {
    id: 'tomb-11',
    name: 'Westside Dental Group',
    slug: 'westside-dental-group',
    imagePath: '/tombstones/westside-dental.jpg',
    industry: 'Healthcare',
    role: 'Sell-Side',
    dealDate: '2024-01-10',
    description: 'Advised multi-location dental practice on DSO partnership.',
    newsSlug: null,
    sortOrder: 11,
    isPublished: true,
    previewToken: generateId(),
    createdAt: daysAgo(300),
    updatedAt: daysAgo(50),
  },
  {
    id: 'tomb-12',
    name: 'Precision Aerospace',
    slug: 'precision-aerospace',
    imagePath: '/tombstones/precision-aero.jpg',
    industry: 'Manufacturing',
    role: 'Buy-Side',
    dealDate: '2023-12-15',
    description: 'Advised strategic acquirer on aerospace component manufacturer.',
    newsSlug: null,
    sortOrder: 12,
    isPublished: false,
    previewToken: generateId(),
    createdAt: daysAgo(330),
    updatedAt: daysAgo(55),
  },
  {
    id: 'tomb-13',
    name: 'Harbor Logistics',
    slug: 'harbor-logistics',
    imagePath: '/tombstones/harbor.jpg',
    industry: 'Distribution',
    role: 'Sell-Side',
    dealDate: '2023-11-20',
    description: 'Represented 3PL company in sale to logistics platform.',
    newsSlug: null,
    sortOrder: 13,
    isPublished: false,
    previewToken: generateId(),
    createdAt: daysAgo(360),
    updatedAt: daysAgo(60),
  },
  {
    id: 'tomb-14',
    name: 'TechStart Ventures',
    slug: 'techstart-ventures',
    imagePath: '/tombstones/techstart.jpg',
    industry: 'Technology',
    role: 'Sell-Side',
    dealDate: null,
    description: 'Draft - technology consulting firm.',
    newsSlug: null,
    sortOrder: 14,
    isPublished: false,
    previewToken: generateId(),
    createdAt: daysAgo(5),
    updatedAt: daysAgo(1),
  },
  {
    id: 'tomb-15',
    name: 'Mountain View Medical',
    slug: 'mountain-view-medical',
    imagePath: '/tombstones/mountain-view.jpg',
    industry: 'Healthcare',
    role: 'Sell-Side',
    dealDate: null,
    description: 'Draft - healthcare services company.',
    newsSlug: null,
    sortOrder: 15,
    isPublished: false,
    previewToken: generateId(),
    createdAt: daysAgo(3),
    updatedAt: daysAgo(1),
  },
];

// ===========================================
// BLOG POSTS
// ===========================================

export const mockBlogPosts: BlogPost[] = [
  {
    id: 'post-1',
    slug: 'healthcare-ma-trends-2024',
    title: 'Healthcare M&A Trends to Watch in 2024',
    excerpt: 'An analysis of the key trends shaping healthcare mergers and acquisitions this year.',
    content: `# Healthcare M&A Trends to Watch in 2024

The healthcare M&A landscape continues to evolve rapidly. Here are the key trends we're seeing:

## 1. Continued DSO Consolidation

Dental service organizations remain active acquirers, with valuations holding steady despite broader market volatility.

## 2. Value-Based Care Driving Deals

Organizations positioned for value-based care arrangements are commanding premium valuations.

## 3. Technology Integration

Healthcare IT companies continue to attract significant investor interest.

## Conclusion

The healthcare M&A market remains robust, with strategic buyers actively pursuing quality targets.`,
    author: 'John Smith',
    category: 'news',
    publishedAt: daysAgo(5),
    isPublished: true,
    previewToken: generateId(),
    createdAt: daysAgo(7),
    updatedAt: daysAgo(5),
  },
  {
    id: 'post-2',
    slug: 'preparing-your-business-for-sale',
    title: 'How to Prepare Your Business for Sale',
    excerpt: 'A comprehensive guide to preparing your company for a successful exit.',
    content: `# How to Prepare Your Business for Sale

Selling a business is a significant undertaking. Here's how to prepare:

## Financial Preparation

- Ensure clean, auditable financial statements
- Normalize owner compensation
- Document revenue concentration

## Operational Readiness

- Create documented processes
- Build a strong management team
- Address any legal or compliance issues

## Timing Considerations

The best time to sell is when performance is strong and the market is favorable.`,
    author: 'Jane Doe',
    category: 'resource',
    publishedAt: daysAgo(15),
    isPublished: true,
    previewToken: generateId(),
    createdAt: daysAgo(20),
    updatedAt: daysAgo(15),
  },
  {
    id: 'post-3',
    slug: 'manufacturing-sector-outlook',
    title: 'Manufacturing Sector M&A Outlook',
    excerpt: 'Analysis of M&A activity in the manufacturing sector.',
    content: `# Manufacturing Sector M&A Outlook

The manufacturing sector continues to see strong M&A activity...`,
    author: 'John Smith',
    category: 'news',
    publishedAt: daysAgo(25),
    isPublished: true,
    previewToken: generateId(),
    createdAt: daysAgo(30),
    updatedAt: daysAgo(25),
  },
  {
    id: 'post-4',
    slug: 'understanding-deal-structures',
    title: 'Understanding M&A Deal Structures',
    excerpt: 'A guide to common deal structures in middle market transactions.',
    content: `# Understanding M&A Deal Structures

Different deal structures can significantly impact outcomes...`,
    author: 'Jane Doe',
    category: 'resource',
    publishedAt: daysAgo(35),
    isPublished: true,
    previewToken: generateId(),
    createdAt: daysAgo(40),
    updatedAt: daysAgo(35),
  },
  {
    id: 'post-5',
    slug: 'healthfirst-acquisition-announced',
    title: 'Flatirons Capital Advises HealthFirst on Acquisition',
    excerpt: 'Flatirons Capital served as exclusive financial advisor to HealthFirst Medical Group.',
    content: `# Flatirons Capital Advises HealthFirst on Acquisition

We are pleased to announce...`,
    author: 'John Smith',
    category: 'news',
    publishedAt: daysAgo(45),
    isPublished: true,
    previewToken: generateId(),
    createdAt: daysAgo(45),
    updatedAt: daysAgo(45),
  },
  {
    id: 'post-6',
    slug: 'due-diligence-checklist',
    title: 'The Complete Due Diligence Checklist',
    excerpt: 'Essential items to prepare for buyer due diligence.',
    content: `# The Complete Due Diligence Checklist

Proper preparation for due diligence is critical...`,
    author: 'Jane Doe',
    category: 'resource',
    publishedAt: daysAgo(55),
    isPublished: true,
    previewToken: generateId(),
    createdAt: daysAgo(60),
    updatedAt: daysAgo(55),
  },
  {
    id: 'post-7',
    slug: 'technology-valuations-2024',
    title: 'Technology Company Valuations in 2024',
    excerpt: 'Current trends in technology company valuations.',
    content: `# Technology Company Valuations in 2024

Technology valuations have normalized from 2021 peaks...`,
    author: 'John Smith',
    category: 'news',
    publishedAt: daysAgo(65),
    isPublished: true,
    previewToken: generateId(),
    createdAt: daysAgo(70),
    updatedAt: daysAgo(65),
  },
  {
    id: 'post-8',
    slug: 'working-with-investment-bankers',
    title: 'How to Work Effectively with Investment Bankers',
    excerpt: 'Tips for business owners considering hiring an investment banker.',
    content: `# How to Work Effectively with Investment Bankers

Choosing the right advisor is critical...`,
    author: 'Jane Doe',
    category: 'resource',
    publishedAt: null,
    isPublished: false,
    previewToken: generateId(),
    createdAt: daysAgo(3),
    updatedAt: daysAgo(1),
  },
  {
    id: 'post-9',
    slug: 'construction-industry-update',
    title: 'Construction Industry M&A Update',
    excerpt: 'Recent developments in construction sector M&A.',
    content: `# Construction Industry M&A Update

The construction industry continues to consolidate...`,
    author: 'John Smith',
    category: 'news',
    publishedAt: null,
    isPublished: false,
    previewToken: generateId(),
    createdAt: daysAgo(2),
    updatedAt: daysAgo(1),
  },
  {
    id: 'post-10',
    slug: 'private-equity-trends',
    title: 'Private Equity Trends in the Middle Market',
    excerpt: 'How private equity is shaping the middle market.',
    content: `# Private Equity Trends in the Middle Market

Private equity continues to play a major role...`,
    author: 'Jane Doe',
    category: 'news',
    publishedAt: null,
    isPublished: false,
    previewToken: generateId(),
    createdAt: daysAgo(1),
    updatedAt: hoursAgo(2),
  },
];

// ===========================================
// PAGE CONTENT
// ===========================================

export const mockPages: PageContent[] = [
  {
    id: 'page-1',
    pageKey: 'about',
    title: 'About Us',
    content: `# About Flatirons Capital Advisors

Flatirons Capital Advisors is a Denver-based investment banking firm specializing in middle market M&A transactions.

## Our Mission

We provide exceptional advisory services to business owners and investors in the Rocky Mountain region and beyond.

## Our Team

Our team brings decades of experience in M&A, private equity, and corporate finance.`,
    metadata: { description: 'Learn about Flatirons Capital Advisors' },
    previewToken: generateId(),
    updatedAt: daysAgo(30),
  },
  {
    id: 'page-2',
    pageKey: 'faq',
    title: 'Frequently Asked Questions',
    content: `# Frequently Asked Questions

## What is M&A?

Mergers and acquisitions refers to the consolidation of companies through various financial transactions.

## How long does a sale process take?

Typically 6-12 months from engagement to close.

## What are your fees?

We work on a success-fee basis, typically 2-5% of transaction value.`,
    metadata: { description: 'Frequently asked questions about M&A' },
    previewToken: generateId(),
    updatedAt: daysAgo(60),
  },
  {
    id: 'page-3',
    pageKey: 'contact',
    title: 'Contact Us',
    content: `# Contact Us

## Office Location

1801 California Street, Suite 2400
Denver, CO 80202

## Phone

(303) 555-0100

## Email

info@flatironscapital.com`,
    metadata: { description: 'Contact Flatirons Capital Advisors' },
    previewToken: generateId(),
    updatedAt: daysAgo(90),
  },
  {
    id: 'page-4',
    pageKey: 'buy-side',
    title: 'Buy-Side Advisory',
    content: `# Buy-Side Advisory Services

We help strategic and financial buyers identify, evaluate, and acquire target companies.

## Our Approach

- Target identification and screening
- Valuation analysis
- Due diligence coordination
- Negotiation support`,
    metadata: { description: 'Buy-side M&A advisory services' },
    previewToken: generateId(),
    updatedAt: daysAgo(45),
  },
  {
    id: 'page-5',
    pageKey: 'team',
    title: 'Our Team',
    content: `# Our Team

## John Smith, Managing Director

John has over 20 years of investment banking experience...

## Jane Doe, Director

Jane specializes in healthcare and technology transactions...`,
    metadata: { description: 'Meet the Flatirons Capital team' },
    previewToken: generateId(),
    updatedAt: daysAgo(75),
  },
  {
    id: 'page-6',
    pageKey: 'privacy',
    title: 'Privacy Policy',
    content: `# Privacy Policy

Last updated: January 1, 2024

## Information We Collect

We collect information you provide directly to us...`,
    metadata: { description: 'Privacy policy' },
    previewToken: generateId(),
    updatedAt: daysAgo(180),
  },
];

// ===========================================
// EMAIL SUBSCRIBERS
// ===========================================

const firstNames = ['James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda', 'William', 'Elizabeth', 'David', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica', 'Thomas', 'Sarah', 'Charles', 'Karen'];
const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin'];
const domains = ['gmail.com', 'yahoo.com', 'outlook.com', 'company.com', 'business.net', 'email.com'];
const sources = ['website', 'intake_form', 'manual', 'referral'];

export const mockSubscribers: EmailSubscriber[] = Array.from({ length: 250 }, (_, i) => {
  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
  const domain = domains[Math.floor(Math.random() * domains.length)];
  const source = sources[Math.floor(Math.random() * sources.length)];
  const isSubscribed = Math.random() > 0.1; // 90% subscribed
  const subscribedDaysAgo = Math.floor(Math.random() * 365);

  return {
    id: `sub-${i + 1}`,
    email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@${domain}`,
    name: `${firstName} ${lastName}`,
    source,
    isSubscribed,
    subscribedAt: daysAgo(subscribedDaysAgo),
    unsubscribedAt: isSubscribed ? null : daysAgo(Math.floor(subscribedDaysAgo / 2)),
  };
});

// ===========================================
// SELLER INTAKES
// ===========================================

export const mockIntakes: SellerIntake[] = [
  {
    id: 'intake-1',
    email: 'tom.wilson@example.com',
    name: 'Tom Wilson',
    companyName: 'Wilson Manufacturing LLC',
    phone: '(303) 555-1234',
    message: 'Looking to explore options for my manufacturing business. Annual revenue around $5M.',
    source: 'website',
    status: 'new',
    createdAt: hoursAgo(2),
    updatedAt: hoursAgo(2),
  },
  {
    id: 'intake-2',
    email: 'sarah.chen@techco.com',
    name: 'Sarah Chen',
    companyName: 'TechCo Solutions',
    phone: '(720) 555-5678',
    message: 'SaaS company with $3M ARR, interested in growth equity or strategic sale.',
    source: 'referral',
    status: 'new',
    createdAt: hoursAgo(8),
    updatedAt: hoursAgo(8),
  },
  {
    id: 'intake-3',
    email: 'mike.johnson@healthmed.com',
    name: 'Mike Johnson',
    companyName: 'HealthMed Clinic',
    phone: '(303) 555-9012',
    message: 'Multi-location medical practice, 5 locations, $8M revenue.',
    source: 'website',
    status: 'contacted',
    createdAt: daysAgo(2),
    updatedAt: daysAgo(1),
  },
  {
    id: 'intake-4',
    email: 'lisa.brown@constructco.com',
    name: 'Lisa Brown',
    companyName: 'ConstructCo',
    phone: '(720) 555-3456',
    message: 'Commercial construction company, looking to retire in 2-3 years.',
    source: 'website',
    status: 'contacted',
    createdAt: daysAgo(5),
    updatedAt: daysAgo(3),
  },
  {
    id: 'intake-5',
    email: 'david.lee@logisticsllc.com',
    name: 'David Lee',
    companyName: 'Logistics LLC',
    phone: '(303) 555-7890',
    message: '3PL company, $12M revenue, strong EBITDA margins.',
    source: 'referral',
    status: 'qualified',
    createdAt: daysAgo(10),
    updatedAt: daysAgo(5),
  },
  {
    id: 'intake-6',
    email: 'jennifer.white@dentalgroup.com',
    name: 'Jennifer White',
    companyName: 'Mountain Dental Group',
    phone: '(720) 555-2345',
    message: '4-location dental practice, interested in DSO partnership.',
    source: 'website',
    status: 'qualified',
    createdAt: daysAgo(15),
    updatedAt: daysAgo(8),
  },
  {
    id: 'intake-7',
    email: 'robert.taylor@itservices.com',
    name: 'Robert Taylor',
    companyName: 'IT Services Inc.',
    phone: '(303) 555-6789',
    message: 'MSP with $4M recurring revenue, growing 25% annually.',
    source: 'website',
    status: 'qualified',
    createdAt: daysAgo(20),
    updatedAt: daysAgo(12),
  },
  {
    id: 'intake-8',
    email: 'amanda.garcia@foodco.com',
    name: 'Amanda Garcia',
    companyName: 'FoodCo Distribution',
    phone: '(720) 555-0123',
    message: 'Food distribution company, $20M revenue.',
    source: 'referral',
    status: 'contacted',
    createdAt: daysAgo(25),
    updatedAt: daysAgo(15),
  },
  {
    id: 'intake-9',
    email: 'chris.martinez@autoparts.com',
    name: 'Chris Martinez',
    companyName: 'AutoParts Plus',
    phone: '(303) 555-4567',
    message: 'Auto parts distributor, 3 locations, $7M revenue.',
    source: 'website',
    status: 'closed',
    createdAt: daysAgo(60),
    updatedAt: daysAgo(30),
  },
  {
    id: 'intake-10',
    email: 'emily.davis@cleaningco.com',
    name: 'Emily Davis',
    companyName: 'CleaningCo Services',
    phone: '(720) 555-8901',
    message: 'Commercial cleaning company, $2M revenue.',
    source: 'website',
    status: 'closed',
    createdAt: daysAgo(45),
    updatedAt: daysAgo(25),
  },
  {
    id: 'intake-11',
    email: 'jason.anderson@hvacpro.com',
    name: 'Jason Anderson',
    companyName: 'HVAC Pro',
    phone: '(303) 555-2345',
    message: 'HVAC services company, strong service agreements.',
    source: 'website',
    status: 'new',
    createdAt: daysAgo(1),
    updatedAt: daysAgo(1),
  },
  {
    id: 'intake-12',
    email: 'michelle.thompson@accounting.com',
    name: 'Michelle Thompson',
    companyName: 'Thompson Accounting',
    phone: '(720) 555-6789',
    message: 'CPA firm with 500+ clients, looking for succession planning.',
    source: 'referral',
    status: 'new',
    createdAt: hoursAgo(12),
    updatedAt: hoursAgo(12),
  },
  {
    id: 'intake-13',
    email: 'kevin.harris@plumbing.com',
    name: 'Kevin Harris',
    companyName: 'Harris Plumbing',
    phone: '(303) 555-0123',
    message: 'Plumbing contractor, $6M revenue, strong team.',
    source: 'website',
    status: 'contacted',
    createdAt: daysAgo(7),
    updatedAt: daysAgo(4),
  },
  {
    id: 'intake-14',
    email: 'stephanie.moore@vetclinic.com',
    name: 'Stephanie Moore',
    companyName: 'Happy Pets Veterinary',
    phone: '(720) 555-4567',
    message: '2-location veterinary clinic, strong recurring revenue.',
    source: 'website',
    status: 'qualified',
    createdAt: daysAgo(12),
    updatedAt: daysAgo(6),
  },
  {
    id: 'intake-15',
    email: 'andrew.clark@landscaping.com',
    name: 'Andrew Clark',
    companyName: 'Green Landscape Co.',
    phone: '(303) 555-8901',
    message: 'Commercial landscaping, $4M revenue.',
    source: 'website',
    status: 'closed',
    createdAt: daysAgo(90),
    updatedAt: daysAgo(60),
  },
  {
    id: 'intake-16',
    email: 'rachel.young@printshop.com',
    name: 'Rachel Young',
    companyName: 'Quick Print Solutions',
    phone: '(720) 555-2345',
    message: 'Commercial printing, declining industry but profitable.',
    source: 'website',
    status: 'closed',
    createdAt: daysAgo(75),
    updatedAt: daysAgo(50),
  },
  {
    id: 'intake-17',
    email: 'brian.walker@security.com',
    name: 'Brian Walker',
    companyName: 'SecureTech Systems',
    phone: '(303) 555-6789',
    message: 'Security systems integrator, $8M revenue, RMR base.',
    source: 'referral',
    status: 'qualified',
    createdAt: daysAgo(18),
    updatedAt: daysAgo(10),
  },
  {
    id: 'intake-18',
    email: 'nicole.hall@staffing.com',
    name: 'Nicole Hall',
    companyName: 'PremierStaffing',
    phone: '(720) 555-0123',
    message: 'IT staffing firm, $15M revenue.',
    source: 'website',
    status: 'contacted',
    createdAt: daysAgo(8),
    updatedAt: daysAgo(5),
  },
  {
    id: 'intake-19',
    email: 'matthew.allen@trucking.com',
    name: 'Matthew Allen',
    companyName: 'Rocky Mountain Trucking',
    phone: '(303) 555-4567',
    message: 'Regional trucking company, 50 trucks.',
    source: 'website',
    status: 'new',
    createdAt: hoursAgo(4),
    updatedAt: hoursAgo(4),
  },
  {
    id: 'intake-20',
    email: 'laura.king@restaurant.com',
    name: 'Laura King',
    companyName: 'King Restaurant Group',
    phone: '(720) 555-8901',
    message: '3 restaurant locations, interested in selling.',
    source: 'website',
    status: 'contacted',
    createdAt: daysAgo(4),
    updatedAt: daysAgo(2),
  },
];

// ===========================================
// EMAIL NOTIFICATIONS
// ===========================================

export const mockEmailNotifications: EmailNotification[] = [
  {
    id: 'notif-1',
    type: 'new_blog_post',
    referenceId: 'post-1',
    sentAt: daysAgo(5),
    recipientCount: 225,
  },
  {
    id: 'notif-2',
    type: 'new_tombstone',
    referenceId: 'tomb-1',
    sentAt: daysAgo(30),
    recipientCount: 210,
  },
  {
    id: 'notif-3',
    type: 'new_blog_post',
    referenceId: 'post-2',
    sentAt: daysAgo(15),
    recipientCount: 218,
  },
];

// ===========================================
// RECENT ACTIVITY
// ===========================================

export const mockRecentActivity: ActivityItem[] = [
  {
    id: 'act-1',
    type: 'tombstone',
    action: 'updated',
    title: 'Precision Manufacturing Co.',
    timestamp: hoursAgo(2),
  },
  {
    id: 'act-2',
    type: 'blog_post',
    action: 'published',
    title: 'Healthcare M&A Trends to Watch in 2024',
    timestamp: daysAgo(1),
  },
  {
    id: 'act-3',
    type: 'intake',
    action: 'created',
    title: 'New intake from Tom Wilson',
    timestamp: hoursAgo(2),
  },
  {
    id: 'act-4',
    type: 'subscriber',
    action: 'created',
    title: '5 new subscribers',
    timestamp: daysAgo(1),
  },
  {
    id: 'act-5',
    type: 'tombstone',
    action: 'created',
    title: 'TechStart Ventures (Draft)',
    timestamp: daysAgo(5),
  },
];

// ===========================================
// ANALYTICS DATA (30 days, hourly)
// ===========================================

export function generatePageViewData(start: string, end: string): { timestamp: string; count: number }[] {
  const data: { timestamp: string; count: number }[] = [];
  const startDate = new Date(start);
  const endDate = new Date(end);
  
  const current = new Date(startDate);
  while (current <= endDate) {
    const hour = current.getHours();
    // Simulate realistic traffic patterns
    let baseViews = 10;
    if (hour >= 9 && hour <= 17) baseViews = 30; // Business hours
    if (hour >= 12 && hour <= 14) baseViews = 45; // Lunch peak
    if (hour >= 0 && hour <= 6) baseViews = 5; // Night time
    
    // Add some randomness
    const variance = Math.floor(Math.random() * 20) - 10;
    const count = Math.max(0, baseViews + variance);
    
    data.push({
      timestamp: current.toISOString(),
      count,
    });
    
    current.setHours(current.getHours() + 1);
  }
  
  return data;
}

export const mockTopPages: { path: string; views: number; title?: string }[] = [
  { path: '/', views: 2450, title: 'Home' },
  { path: '/about', views: 890, title: 'About Us' },
  { path: '/transactions', views: 756, title: 'Transactions' },
  { path: '/news', views: 623, title: 'News' },
  { path: '/contact', views: 512, title: 'Contact' },
  { path: '/buy-side', views: 445, title: 'Buy-Side' },
  { path: '/resources', views: 389, title: 'Resources' },
  { path: '/team', views: 334, title: 'Our Team' },
  { path: '/news/healthcare-ma-trends-2024', views: 278, title: 'Healthcare M&A Trends' },
  { path: '/seller-intake', views: 234, title: 'Seller Intake Form' },
];
