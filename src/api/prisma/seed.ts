/**
 * Database Seed Script
 *
 * Seeds the database with:
 * - ContentTag taxonomy
 * - Assets (S3 file registry for tombstone images, awards, hero, OG)
 * - Tombstones from CSV (linked to Asset records via assetId FK)
 * - BlogPosts from markdown files (news + articles)
 * - Static page content (team, FAQ, core values, etc.)
 * - PageContent for homepage and other pages
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { TAG_TAXONOMY, matchContentToTags } from '../src/lib/taxonomy';

const prisma = new PrismaClient();

// Seed logger -- wraps console for eslint compliance
const log = {
  info: (...args: unknown[]): void => { process.stdout.write(args.map(String).join(' ') + '\n'); },
  error: (...args: unknown[]): void => { process.stderr.write(args.map(String).join(' ') + '\n'); },
};

// Seed data lives alongside this file in prisma/data/
const SEED_DATA_DIR = path.resolve(__dirname, 'data');
const TOMBSTONES_CSV = path.join(SEED_DATA_DIR, 'tombstones.csv');
const NEWS_DIR = path.join(SEED_DATA_DIR, 'news');
const ARTICLES_DIR = path.join(SEED_DATA_DIR, 'articles');

// ============================================
// UTILITY FUNCTIONS
// ============================================

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function parseCSV(content: string): Record<string, string>[] {
  const lines = content.trim().split('\n');
  const headers = lines[0].split(',').map((h) => h.trim());

  const rows: Record<string, string>[] = [];
  let currentRow: string[] = [];
  let inQuotes = false;
  let currentField = '';

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];

    for (let j = 0; j < line.length; j++) {
      const char = line[j];

      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        currentRow.push(currentField.trim());
        currentField = '';
      } else {
        currentField += char;
      }
    }

    if (!inQuotes) {
      currentRow.push(currentField.trim());
      currentField = '';

      const row: Record<string, string> = {};
      headers.forEach((header, idx) => {
        row[header] = currentRow[idx] || '';
      });
      rows.push(row);
      currentRow = [];
    } else {
      currentField += '\n';
    }
  }

  return rows;
}

interface MarkdownMetadata {
  title: string;
  url?: string;
  author?: string;
  date?: string;
  category?: string;
  body: string;
}

function parseMarkdown(content: string): MarkdownMetadata {
  const lines = content.split('\n');

  let title = '';
  let url = '';
  let author = '';
  let date = '';
  let category = '';
  let bodyStartIndex = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Title from H1
    if (line.startsWith('# ')) {
      title = line.substring(2).trim();
      continue;
    }

    // Metadata fields
    if (line.startsWith('**URL:**')) {
      url = line.replace('**URL:**', '').trim();
      continue;
    }
    if (line.startsWith('**Author:**')) {
      author = line.replace('**Author:**', '').trim();
      continue;
    }
    if (line.startsWith('**Date:**')) {
      date = line.replace('**Date:**', '').trim();
      continue;
    }
    if (line.startsWith('**Category:**')) {
      category = line.replace('**Category:**', '').trim();
      continue;
    }

    // First --- after metadata marks start of body
    if (line === '---' && title) {
      bodyStartIndex = i + 1;
      break;
    }
  }

  const body = lines.slice(bodyStartIndex).join('\n').trim();

  return { title, url, author, date, category, body };
}

/**
 * Load tombstone image path mapping: first from nextjs-web's tombstones.ts (when mounted),
 * then from bundled prisma/tombstone-images.json (always available in Docker image).
 */
function loadTombstoneImages(): Record<string, string> {
  const out: Record<string, string> = {};
  // Load from bundled tombstone-images.json (canonical source)
  const jsonPath = path.join(__dirname, 'tombstone-images.json');
  if (fs.existsSync(jsonPath)) {
    const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8')) as Record<string, string>;
    Object.assign(out, data);
  }
  // Aliases: CSV seller name -> canonical key in mapping (so all CSV rows resolve to an image when we have one)
  const aliases: [string, string][] = [
    ['World Resoures Distribution', 'World Resources Distribution'],
    ['Precision Pool & Spa', 'Precision Pool and Spa'],
    ["Pod's Complete Car Care", 'PODs Complete Car Care and Accessories'],
    ['thriveMD', 'ThriveMD-Platt Park & Formula Wellness'],
    ['AEG Petroleum', 'AEG Petroleum LLC'],
    ['MEC', 'MEC Builds'],
    ["Henrichsen's Fire & Safety Equipment Co", 'Henrichsens Fire and Safety Equipment Co'],
    ['Maple Grove Auto Service', 'Maple Grove Auto'],
    ['Go Green Lawn & Pest Control', 'GoGreen Lawn Services'],
    ['Top Gun Collision Experts', 'Top Gun'],
    ['Ecological Resource Consulting Inc', 'Ecological Resource Consultants, Inc'],
    ['Stratified Environmental & Archaeological Services', 'Stratified Environmental'],
    ['General Fire Sprinkler Co', 'General Fire Sprinkler Company LLC'],
    ['IVA Environmental Consulting Services', 'Ian Vincent & Associates Environmental Consulting Services'],
    ['AWE', 'AWE Air Water Energy'],
    ['The Specialists Automotive & Truck', 'The Specialists Automotive and Truck'],
    ['Murraysmith Inc', 'Murray Smith, Inc'],
    ['North Shore Fire Equipment', 'Northshore Fire Equipment'],
    ['Digital Imaging and Laser Products Inc', 'DI Digital Imaging and Laser Products, Inc.'],
    ['Key Enterprises Inc', 'Key Enterprises, Inc.'],
    ['P and J Sprinkler Company Inc', 'P&J Sprinkler Company, Inc'],
    ['Florida Fire Services Inc', 'Florida Fire Service'],
    ['Rocky Mountain Medical Equipment Inc', 'Rocky Mountains Medical Equipment, Inc'],
    ['Johnsons Corner', "Johnson's Corner"],
    ['Sim Author Inc', 'Sim Author'],
    ['Henry Smith Plumbing Heating & Cooling', 'Henry Smith Plumbing, Heating'],
    ['SWC', 'SWC, Inc'],
    ['Kennebec Fire Equipment', 'Kennebec Fire Equipment, Inc'],
    ['Integrity Fire', 'Integrity Fire Safety Services'],
    ['Big Bear A/C & Heating', 'Big Bear Air Conditioning and Heating'],
    ['P&J Sprinkler Co', 'P&J Sprinkler Company, Inc'],
    ['Florida Fire Service Co', 'Florida Fire Service'],
    ['JOBS / AMST', 'JOBS-AMST'],
    ['SWM International', 'SWM International, Inc'],
    ['KMS Inc', 'KMS, Inc'],
    ['Fire Protection Concepts Inc', 'Fire Protection Concepts, Inc'],
    ['OnePoint BPO Services', 'OnePoint BPO Services, LLC'],
    ["Saul's Seismic", 'SAULS Seismic, Inc'],
    ['Pacific Cabinets Inc', 'Pacific Cabinets, Inc.'],
    ['Sound Perfection Inc', 'Sound Perfection, Inc'],
    ['Another Line Inc', 'Another Line, Inc'],
    ['Mossberg & Midwest Sanitation', 'Mossberg Sanitation, Inc. and Midwest Sanitation Co., Inc'],
    ['Whitworth Tool Inc', 'Whitworth Tool, Inc'],
    ['Inter-American Oil Works Inc', 'Oil Works, Inc'],
    ['Permian Fabrication & Services LP', 'Permian Fabrication and Services'],
    ['Rocky Mountain Medical Equipment Inc', 'Rocky Mountains Medical Equipment, Inc'],
    ['Recon Petrotechnologies', 'RECON Petrotechnologies, Inc'],
    ["Johnston's Corner", "Johnson's Corner"],
    ['Jim Myers Drugs Inc', 'Jim Myers Drug, Inc'],
    ["Hammer's Quality Business Systems", 'Hammers Quality Business Systems, Inc'],
    ['Essco Discount Drugs', 'Essco Discount Drug Center'],
    ['Burlington Pharmacy Healthcare', 'Burlington Pharmacy Health Care'],
    ['Bond Coat Inc', 'Bond Coat, Inc'],
    ['Asher Agency', 'Asher Agency, Inc'],
    ['Signal One Fire & Communications', 'Signal One Fire and Communication'],
    ['Breckenridge Ski Enterprises Inc', 'Breckenbridge Ski Enterprises'],
    ['Bid4Vacations.com', 'Bid4Vacations'],
    ['SimAuthor Inc', 'Sim Author'],
    ['UCH Pharmaceutical Services', 'UCH Pharmaceutical Services'],
    ['BBB Tank Services Inc', 'BBB Tank Services, Inc'],
    ['Colorado Lining International', 'Colorado Lining International, Inc'],
  ];
  for (const [csvName, canonicalKey] of aliases) {
    if (out[canonicalKey] && !out[csvName]) {
      out[csvName] = out[canonicalKey];
    }
  }
  return out;
}

/** Normalize name for matching (lowercase, collapse punctuation/spaces). */
function normalizeNameForMatch(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extract S3 key from a full S3 URL.
 * e.g. "https://bucket.s3.region.amazonaws.com/tombstones/foo.jpg" -> "tombstones/foo.jpg"
 */
function extractS3KeyFromUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.pathname.slice(1); // Remove leading slash
  } catch {
    return url;
  }
}

/**
 * Resolve S3 key for a tombstone name: exact key match, or normalized match.
 * Returns the S3 key (not the full URL).
 */
function resolveS3Key(
  name: string,
  tombstoneImages: Record<string, string>
): string | null {
  if (tombstoneImages[name]) {return extractS3KeyFromUrl(tombstoneImages[name]);}
  const normalized = normalizeNameForMatch(name);
  for (const [key, url] of Object.entries(tombstoneImages)) {
    if (normalizeNameForMatch(key) === normalized) {return extractS3KeyFromUrl(url);}
  }
  return null;
}

function parseDate(dateStr: string | undefined): Date | null {
  if (!dateStr) {return null;}

  // Handle formats like "January 2024", "March 2023", etc.
  const monthYearMatch = dateStr.match(/(\w+)\s+(\d{4})/);
  if (monthYearMatch) {
    const months: Record<string, number> = {
      january: 0, february: 1, march: 2, april: 3,
      may: 4, june: 5, july: 6, august: 7,
      september: 8, october: 9, november: 10, december: 11,
    };
    const month = months[monthYearMatch[1].toLowerCase()];
    const year = parseInt(monthYearMatch[2], 10);
    if (month !== undefined && !isNaN(year)) {
      return new Date(year, month, 1);
    }
  }

  // Try standard date parsing
  const parsed = new Date(dateStr);
  return isNaN(parsed.getTime()) ? null : parsed;
}

// ============================================
// SEED FUNCTIONS
// ============================================

async function seedSiteConfig(): Promise<void> {
  log.info('Seeding site config...');

  const siteConfigData = {
    name: 'Flatirons Capital Advisors',
    tagline: 'Strategic Advice | Process Driven™',
    url: 'https://flatironscap.com',
    description: 'Flatirons Capital Advisors is a North American mergers and acquisitions advisory firm specializing in lower middle-market transactions.',
    phone: '303.319.4540',
    email: 'info@flatironscap.com',
    linkedIn: 'https://www.linkedin.com/company/flatirons-capital-advisors-llc',
    ogImage: 'https://fca-assets-113862367661.s3.us-east-2.amazonaws.com/meta/og-image.jpg',
    locations: [
      { city: 'Denver', state: 'Colorado' },
      { city: 'Dallas', state: 'Texas' },
      { city: 'Miami', state: 'Florida' },
      { city: 'Chicago', state: 'Illinois' },
    ],
    navItems: [
      { name: 'About', href: '/about' },
      { name: 'Team', href: '/team' },
      { name: 'Transactions', href: '/transactions' },
      { name: 'News', href: '/news' },
      { name: 'Resources', href: '/resources' },
      { name: 'FAQ', href: '/faq' },
      { name: 'Contact', href: '/contact' },
    ],
    footerNav: {
      services: [
        { name: 'Sell-Side Advisory', href: '/sell-side' },
        { name: 'Buy-Side Advisory', href: '/buy-side' },
        { name: 'Strategic Consulting', href: '/about' },
      ],
      company: [
        { name: 'About', href: '/about' },
        { name: 'Team', href: '/team' },
        { name: 'Transactions', href: '/transactions' },
        { name: 'Contact', href: '/contact' },
      ],
      resources: [
        { name: 'News & Insights', href: '/news' },
        { name: 'Resources', href: '/resources' },
        { name: 'FAQ', href: '/faq' },
        { name: 'Privacy Policy', href: '/privacy-policy' },
      ],
    },
    serviceTypes: [
      'Mergers and Acquisitions Advisory',
      'Sell-Side Advisory',
      'Buy-Side Advisory',
      'Strategic Consulting',
      'Investment Banking',
    ],
    companyBlurb: 'Flatirons Capital Advisors, LLC is an investment banking firm that helps privately held companies sell their businesses, acquire other businesses, and raise capital. Our unique business model affords sell-side advisory clients the ability to improve their company\'s performance while simultaneously increasing their market value for a future sale.',
  };

  await prisma.siteConfig.upsert({
    where: { id: 'default' },
    update: siteConfigData,
    create: { id: 'default', ...siteConfigData },
  });

  log.info('  Seeded site config');
}

async function seedContentTags(): Promise<void> {
  log.info('Seeding content tags...');

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

  log.info(`  Seeded ${TAG_TAXONOMY.length} content tags`);
}

async function seedAssets(): Promise<void> {
  log.info('Seeding assets from existing S3 references...');

  const tombstoneImages = loadTombstoneImages();
  let count = 0;

  // 1. Seed tombstone image assets from tombstone-images.json
  for (const [_name, url] of Object.entries(tombstoneImages)) {
    const s3Key = extractS3KeyFromUrl(url);
    const fileName = s3Key.split('/').pop() || s3Key;

    await prisma.asset.upsert({
      where: { s3Key },
      update: {},
      create: {
        fileName,
        s3Key,
        fileType: 'image/jpeg',
        category: 'photo',
        title: _name,
      },
    });
    count++;
  }

  // 2. Seed award image assets
  const awardImages = [
    { s3Key: 'awards/axial-top-10-investment-bank-2022.png', title: 'Axial Top 10 Investment Bank 2022' },
    { s3Key: 'awards/top50-software-email-2x.png', title: 'Top 50 Software Axial 2023' },
    { s3Key: 'awards/axial-top-ib-badge-2020-359x450.png', title: 'Axial Top IB 2020' },
    { s3Key: 'awards/2023-axial-advisor-100.png', title: '2023 Axial Advisor 100' },
    { s3Key: 'awards/nfpa-member.png', title: 'NFPA Member' },
  ];

  for (const award of awardImages) {
    const fileName = award.s3Key.split('/').pop() || award.s3Key;
    await prisma.asset.upsert({
      where: { s3Key: award.s3Key },
      update: {},
      create: {
        fileName,
        s3Key: award.s3Key,
        fileType: 'image/png',
        category: 'photo',
        title: award.title,
      },
    });
    count++;
  }

  // 3. Seed hero image asset
  await prisma.asset.upsert({
    where: { s3Key: 'hero/flatironsherowinter.jpg' },
    update: {},
    create: {
      fileName: 'flatironsherowinter.jpg',
      s3Key: 'hero/flatironsherowinter.jpg',
      fileType: 'image/jpeg',
      category: 'photo',
      title: 'Homepage Hero Image',
    },
  });
  count++;

  // 4. Seed OG image asset
  await prisma.asset.upsert({
    where: { s3Key: 'meta/og-image.jpg' },
    update: {},
    create: {
      fileName: 'og-image.jpg',
      s3Key: 'meta/og-image.jpg',
      fileType: 'image/jpeg',
      category: 'photo',
      title: 'OG Image',
    },
  });
  count++;

  log.info(`  Seeded ${count} assets`);
}

async function seedTombstones(): Promise<void> {
  log.info('Seeding tombstones from CSV...');

  const tombstoneImages = loadTombstoneImages();
  log.info(`  Loaded ${Object.keys(tombstoneImages).length} tombstone image mappings`);

  const content = fs.readFileSync(TOMBSTONES_CSV, 'utf-8');
  const rows = parseCSV(content);

  let count = 0;
  for (const row of rows) {
    const name = row.seller?.trim();
    if (!name) {continue;}

    const slug = generateSlug(name);
    const transactionYear = row.transaction_year
      ? parseInt(row.transaction_year, 10)
      : null;
    const s3Key = resolveS3Key(name, tombstoneImages);

    // Look up the Asset record by s3Key to get the assetId
    let assetId: string | null = null;
    if (s3Key) {
      const asset = await prisma.asset.findUnique({ where: { s3Key } });
      assetId = asset?.id || null;
    }

    // Match industry based on keywords
    const industryText = `${row.industry || ''} ${row.keywords || ''}`;
    const matchedTags = matchContentToTags(industryText);

    const tombstone = await prisma.tombstone.upsert({
      where: { slug },
      update: {
        name,
        assetId,
        industry: row.industry || null,
        buyerPeFirm: row.buyer_pe_firm || null,
        buyerPlatform: row.buyer_platform || null,
        transactionYear,
        city: row.city || null,
        state: row.state || null,
        isPublished: true,
      },
      create: {
        name,
        slug,
        assetId,
        industry: row.industry || null,
        buyerPeFirm: row.buyer_pe_firm || null,
        buyerPlatform: row.buyer_platform || null,
        transactionYear,
        city: row.city || null,
        state: row.state || null,
        isPublished: true,
      },
    });

    // Link tags
    for (const tagSlug of matchedTags.slice(0, 5)) {
      const tag = await prisma.contentTag.findUnique({ where: { slug: tagSlug } });
      if (tag) {
        await prisma.tombstoneTag.upsert({
          where: {
            tombstoneId_tagId: { tombstoneId: tombstone.id, tagId: tag.id },
          },
          update: {},
          create: { tombstoneId: tombstone.id, tagId: tag.id },
        });
      }
    }

    count++;
  }

  log.info(`  Seeded ${count} tombstones`);
}

async function seedBlogPosts(): Promise<void> {
  log.info('Seeding blog posts from markdown...');

  let newsCount = 0;
  let articlesCount = 0;

  // Seed news articles
  if (fs.existsSync(NEWS_DIR)) {
    const newsFiles = fs.readdirSync(NEWS_DIR).filter((f) => f.endsWith('.md'));

    for (const file of newsFiles) {
      const content = fs.readFileSync(path.join(NEWS_DIR, file), 'utf-8');
      const { title, author, date, body } = parseMarkdown(content);

      if (!title) {continue;}

      const slug = file.replace('.md', '');
      const publishedAt = parseDate(date);

      // Prepend title as H1 to content so it renders as part of the markdown
      const fullContent = `# ${title}\n\n${body}`;

      const blogPost = await prisma.blogPost.upsert({
        where: { slug },
        update: {
          title,
          content: fullContent,
          author: author || null,
          category: 'news',
          publishedAt,
          isPublished: true,
        },
        create: {
          slug,
          title,
          content: fullContent,
          author: author || null,
          category: 'news',
          publishedAt,
          isPublished: true,
        },
      });

      // Match tags based on content
      const matchedTags = matchContentToTags(`${title} ${body}`);
      for (const tagSlug of matchedTags.slice(0, 5)) {
        const tag = await prisma.contentTag.findUnique({ where: { slug: tagSlug } });
        if (tag) {
          await prisma.blogPostTag.upsert({
            where: {
              blogPostId_tagId: { blogPostId: blogPost.id, tagId: tag.id },
            },
            update: {},
            create: { blogPostId: blogPost.id, tagId: tag.id },
          });
        }
      }

      newsCount++;
    }
  }

  // Seed resource articles
  if (fs.existsSync(ARTICLES_DIR)) {
    const articleFiles = fs.readdirSync(ARTICLES_DIR).filter((f) => f.endsWith('.md'));

    for (const file of articleFiles) {
      const content = fs.readFileSync(path.join(ARTICLES_DIR, file), 'utf-8');
      const { title, author, body } = parseMarkdown(content);

      if (!title) {continue;}

      const slug = file.replace('.md', '');

      // Prepend title as H1 to content so it renders as part of the markdown
      const fullContent = `# ${title}\n\n${body}`;

      const blogPost = await prisma.blogPost.upsert({
        where: { slug },
        update: {
          title,
          content: fullContent,
          author: author || null,
          category: 'resource',
          isPublished: true,
        },
        create: {
          slug,
          title,
          content: fullContent,
          author: author || null,
          category: 'resource',
          isPublished: true,
        },
      });

      // Match tags
      const matchedTags = matchContentToTags(`${title} ${body}`);
      for (const tagSlug of matchedTags.slice(0, 5)) {
        const tag = await prisma.contentTag.findUnique({ where: { slug: tagSlug } });
        if (tag) {
          await prisma.blogPostTag.upsert({
            where: {
              blogPostId_tagId: { blogPostId: blogPost.id, tagId: tag.id },
            },
            update: {},
            create: { blogPostId: blogPost.id, tagId: tag.id },
          });
        }
      }

      articlesCount++;
    }
  }

  log.info(`  Seeded ${newsCount} news articles`);
  log.info(`  Seeded ${articlesCount} resource articles`);
}

async function linkPressReleases(): Promise<void> {
  log.info('Linking press releases to tombstones...');

  // Get all tombstones and blog posts
  const tombstones = await prisma.tombstone.findMany();
  const blogPosts = await prisma.blogPost.findMany({
    where: { category: 'news' },
  });

  let linkedCount = 0;
  // Track which blog posts have already been linked (unique constraint)
  const linkedBlogPostIds = new Set<string>();

  for (const tombstone of tombstones) {
    // Try to find a matching press release by company name
    const normalizedName = tombstone.name.toLowerCase().replace(/[^a-z0-9]/g, '');

    for (const blogPost of blogPosts) {
      // Skip if this blog post is already linked to another tombstone
      if (linkedBlogPostIds.has(blogPost.id)) {
        continue;
      }

      const normalizedTitle = blogPost.title.toLowerCase().replace(/[^a-z0-9]/g, '');
      const normalizedContent = blogPost.content.toLowerCase().replace(/[^a-z0-9]/g, '');

      // Check if company name appears in title or content
      if (normalizedTitle.includes(normalizedName) || normalizedContent.includes(normalizedName)) {
        await prisma.tombstone.update({
          where: { id: tombstone.id },
          data: { pressReleaseId: blogPost.id },
        });
        linkedBlogPostIds.add(blogPost.id);
        linkedCount++;
        break;
      }
    }
  }

  log.info(`  Linked ${linkedCount} press releases to tombstones`);
}

async function seedTeamMembers(): Promise<void> {
  log.info('Seeding team members...');

  const leadership = [
    {
      name: 'R. Michael Allen',
      title: 'CEO and Founder',
      image: '/team/mike-allen.jpg',
      bio: `As CEO and Founder, Mr. Allen leads our Business Development Group and assesses potential buyer interest in our firm's prospective sell-side opportunities. With more than 25 years of M&A experience, Mr. Allen has been directly involved in the execution of more than 400 client transactions.`,
      linkedIn: 'https://www.linkedin.com/in/rmichaelallen',
      email: 'mallen@flatironscap.com',
      category: 'leadership',
      sortOrder: 0,
    },
    {
      name: 'Keith Wegen',
      title: 'President and Founder',
      image: '/team/keith-wegen.jpg',
      bio: `As President and Founder, Mr. Wegen's principal activity is to direct the firm's M&A activities. He oversees the team that guides the firm's clients from engagement through the closing of a transaction.`,
      linkedIn: 'https://www.linkedin.com/in/keithwegen',
      email: 'kwegen@flatironscap.com',
      category: 'leadership',
      sortOrder: 1,
    },
    {
      name: 'L.A. "Skip" Plauche',
      title: 'Managing Director',
      image: '/team/skip-plauche.jpg',
      bio: `As Managing Director, Mr. Plauche is responsible for industry analysis, target identification, and all information, data, and research efforts to support our engagements.`,
      linkedIn: 'https://www.linkedin.com/in/skipplauche/',
      email: 'splauche@flatironscap.com',
      category: 'leadership',
      sortOrder: 2,
    },
    {
      name: 'Michael R. Moritz',
      title: 'Managing Director - Technology & Professional Services',
      image: '/team/mike-moritz.jpg',
      bio: `As the leader of our Technology and Professional Services efforts, Mr. Moritz joined FCA at our 2015 inception. During his investment banking career, he has led many successful deals.`,
      email: 'mmoritz@flatironscap.com',
      category: 'leadership',
      sortOrder: 3,
    },
    {
      name: 'Connor Slivocka',
      title: 'Managing Director',
      image: '/team/connor-slivocka.jpg',
      bio: `Connor has spent his career working with business owners and investors on growth strategy and M&A execution. At Flatirons, he leads deal sourcing across home services, industrials, energy, technology, and healthcare.`,
      linkedIn: 'https://www.linkedin.com/in/connorslivocka/',
      email: 'cslivocka@flatironscap.com',
      category: 'leadership',
      sortOrder: 4,
    },
  ];

  const analysts = [
    {
      name: 'Umair Ishaq',
      title: 'Analyst',
      image: '/team/umair-ishaq.jpg',
      bio: 'Umair is an analyst for Flatirons Capital Advisors. His primary functions at the firm include research and analytical work, as well as business development.',
      email: 'umair@flatironscap.com',
      category: 'analyst',
      sortOrder: 0,
    },
    {
      name: 'Rachelle Ramos',
      title: 'Analyst',
      image: '/team/rachelle-ramos.jpg',
      bio: "Rachelle provides virtual assistance for Flatirons Capital Advisors. Her administrative functions include research, calendar management, email correspondence, and the development of marketing materials.",
      email: 'rramos@flatironscap.com',
      category: 'analyst',
      sortOrder: 1,
    },
    {
      name: 'Devanshi Nagpal',
      title: 'Analyst',
      image: '/team/devanshi-nagpal.jpg',
      bio: 'Devanshi excels in drafting CIMs, teasers, and pitch decks, conducting financial modeling, performing market research, and developing buyer lists.',
      linkedIn: 'https://www.linkedin.com/in/devanshi-nagpal-68505118a/',
      category: 'analyst',
      sortOrder: 2,
    },
    {
      name: 'Rossel Dacio',
      title: 'Analyst',
      image: '/team/rossel-dacio.jpg',
      bio: 'Rossel provides virtual assistance including web administration, SEO, social media management, and research.',
      linkedIn: 'https://www.linkedin.com/in/rosseldacio/',
      category: 'analyst',
      sortOrder: 3,
    },
    {
      name: 'Rhonnell Dacio',
      title: 'Analyst',
      image: '/team/rhonnell-dacio.jpg',
      bio: 'Rhonnell provides virtual assistance handling administrative functions such as calendar management, email correspondence, and research.',
      category: 'analyst',
      sortOrder: 4,
    },
  ];

  const allMembers = [...leadership, ...analysts];

  for (const member of allMembers) {
    await prisma.teamMember.upsert({
      where: { id: generateSlug(member.name) },
      update: member,
      create: {
        id: generateSlug(member.name),
        ...member,
      },
    });
  }

  log.info(`  Seeded ${allMembers.length} team members`);
}

async function seedCommunityServices(): Promise<void> {
  log.info('Seeding community services...');

  const services = [
    {
      name: 'Rippling Waters Kego',
      description: 'Providing sustainable education, food, and water for the orphaned children of the Lake Victoria area impacted by the AIDS epidemic.',
      url: 'https://ripplingwaterskego.org/',
      sortOrder: 0,
    },
    {
      name: 'Community Food Share',
      description: "Working to end hunger in Boulder and Broomfield Counties. The team works on the floor of the distribution center on a weekly basis.",
      url: 'https://communityfoodshare.org/',
      sortOrder: 1,
    },
    {
      name: 'Project Healing Waters',
      description: 'Dedicated to the physical and emotional rehabilitation of disabled veterans through fly fishing.',
      url: 'http://projecthealingwaters.org',
      sortOrder: 2,
    },
    {
      name: 'Skate for Prostate',
      description: 'Created by Keith Wegen, raising tens of thousands of dollars for prostate cancer awareness.',
      url: 'https://www.facebook.com/skateforprostate/',
      sortOrder: 3,
    },
    {
      name: 'Wounded Warrior Project',
      description: 'Participated in more than 14 Tough Mudders and led teams in fundraising efforts for the Wounded Warrior Project.',
      url: 'http://www.woundedwarriorproject.org/',
      sortOrder: 4,
    },
  ];

  for (const service of services) {
    await prisma.communityService.upsert({
      where: { id: generateSlug(service.name) },
      update: service,
      create: {
        id: generateSlug(service.name),
        ...service,
      },
    });
  }

  log.info(`  Seeded ${services.length} community services`);
}

async function seedFAQs(): Promise<void> {
  log.info('Seeding FAQs...');

  const faqs = [
    {
      question: 'Who is Flatirons Capital Advisors and what do you do?',
      answer: `We are, first and foremost, an investment banking firm—one that provides private businesses with growth strategy and exit planning advisory services. Our unique business model enables us to improve our sell-side advisory clients' positioning in market through leveraged growth and lean operations practices.`,
      sortOrder: 0,
    },
    {
      question: 'What steps will Flatirons take to ensure the sale of my company is handled in a confidential manner?',
      answer: `Engaging a qualified transaction advisor like Flatirons is the first step to maintaining confidentiality. Our team of professional advisors can enhance and increase the universe of prospective buyers through our proprietary research methods, existing buyer relationships, and experience managing an effective and efficient buyer search process.`,
      sortOrder: 1,
    },
    {
      question: 'Can Flatirons advise me with valuing my company?',
      answer: `Yes, we can provide a general range of value based on our experience. Determining an enterprise value is part of our exit planning process, and occurs early on in the relationship. We use the very same valuation methods that buyers use.`,
      sortOrder: 2,
    },
    {
      question: 'Will Flatirons be with me throughout the entire M&A process?',
      answer: `Yes, whether you decide to engage Flatirons for stand-alone Business Advisory or M&A Advisory services, we will serve as your trusted advisor throughout the entire process.`,
      sortOrder: 3,
    },
    {
      question: 'Does Flatirons perform stand-alone consulting services?',
      answer: `Yes, we do. Whether or not you are a "client" of Flatirons for full exit planning services, we can provide stand-alone consulting services to your company.`,
      sortOrder: 4,
    },
    {
      question: 'I have received an unsolicited offer for my company. Do I need to engage a professional investment banking firm?',
      answer: `Most business owners will only sell their companies once, and with so much of your personal net worth and future livelihood on the line, it makes sense to engage with an experienced professional who can manage the process.`,
      sortOrder: 5,
    },
    {
      question: 'I used an online "valuation calculator" and it said my company is worth a "multiple" of x. How accurate are these types of calculators?',
      answer: `Not very accurate. "Multiples" are used in the industry, AFTER detailed valuations have taken place and a deal is consummated, as a method of communicating the END result of a deal.`,
      sortOrder: 6,
    },
    {
      question: 'Are businesses valued based on a multiple of earnings or a multiple of revenues?',
      answer: `Without sounding repetitive, valuation multiples are not reliable in determining an accurate value for a business in a majority of cases. Buyers will calculate value based on several criteria that impact two primary value drivers: Risk and Return on Investment.`,
      sortOrder: 7,
    },
  ];

  for (let i = 0; i < faqs.length; i++) {
    await prisma.fAQ.upsert({
      where: { id: `faq-${i}` },
      update: faqs[i],
      create: {
        id: `faq-${i}`,
        ...faqs[i],
      },
    });
  }

  log.info(`  Seeded ${faqs.length} FAQs`);
}

async function seedCoreValues(): Promise<void> {
  log.info('Seeding core values...');

  const values = [
    { title: 'Open and Honest Communication', description: 'We speak our minds to our clients and demand the same from all others we work with.', icon: '/icons/comm.png', sortOrder: 0 },
    { title: 'Listen Well, Act Quickly', description: 'Every day we strive to listen well, seek counsel, then act decisively.', icon: '/icons/listen.png', sortOrder: 1 },
    { title: 'Focus', description: 'We tirelessly seek to understand your priorities and systematically refresh our objectives.', icon: '/icons/focus.png', sortOrder: 2 },
    { title: 'Accountability', description: 'We deliver on our commitments and are transparent about progress and outcomes.', icon: '/icons/accountability.png', sortOrder: 3 },
    { title: 'Customer Satisfaction', description: 'We only agree to what we can deliver, and always deliver what we agree to.', icon: '/icons/customer-satisfaction.png', sortOrder: 4 },
    { title: 'Relentlessness', description: 'We inspire ourselves and our teams to a higher state of performance and quality.', icon: '/icons/relentlessness.png', sortOrder: 5 },
    { title: 'Respect', description: 'We demand ourselves to be professional with every interaction, treating you with the utmost respect and honesty.', icon: '/icons/respect.png', sortOrder: 6 },
    { title: 'Extraordinary Teamwork', description: 'Every person has a role on our team. We communicate and count on everyone to play their part flawlessly.', icon: '/icons/teamwork.png', sortOrder: 7 },
    { title: 'Intelligence', description: 'We constantly drive creative ideas and bring the best practices to our Company and to you, our client.', icon: '/icons/intelligence.png', sortOrder: 8 },
    { title: 'Bold Consistent Vision', description: 'We deliver a compelling, shared vision that passes the elevator test of simplicity.', icon: '/icons/vision.png', sortOrder: 9 },
  ];

  for (const value of values) {
    await prisma.coreValue.upsert({
      where: { id: generateSlug(value.title) },
      update: value,
      create: {
        id: generateSlug(value.title),
        ...value,
      },
    });
  }

  log.info(`  Seeded ${values.length} core values`);
}

async function seedIndustrySectors(): Promise<void> {
  log.info('Seeding industry sectors...');

  const sectors = [
    { name: 'Information Technology', description: 'Hardware, Software (Big Data Business Analytics, ERP, etc.), Professional Services, Telecommunications, Biotech and Biomed Manufacturing Technologies', sortOrder: 0 },
    { name: 'Distribution', description: 'Food & Beverage Services, Consumer Products', sortOrder: 1 },
    { name: 'Energy', description: 'Oil & Gas Support Services and Manufacturing', sortOrder: 2 },
    { name: 'Manufacturing', description: 'Specialty Machinery, Aerospace, Fabricated Metal Products, Semiconductor, Surgical/Medical Equipment, Pharmaceutical', sortOrder: 3 },
    { name: 'Healthcare', description: 'Medical and Diagnostic Laboratories, Home Health Care Services, Specialized Urgent Care, Pharmacies', sortOrder: 4 },
    { name: 'Business Services', description: 'Fire and Life Safety, HVAC, Specialty Construction, Supply Chain', sortOrder: 5 },
  ];

  for (const sector of sectors) {
    await prisma.industrySector.upsert({
      where: { id: generateSlug(sector.name) },
      update: sector,
      create: {
        id: generateSlug(sector.name),
        ...sector,
      },
    });
  }

  log.info(`  Seeded ${sectors.length} industry sectors`);
}

async function seedServiceOfferings(): Promise<void> {
  log.info('Seeding service offerings...');

  const offerings = [
    // Sell-side services
    { title: 'Private Company Exits', description: 'Full-service representation for owners looking to sell their business, maximizing value through a competitive auction process.', category: 'sell-side', type: 'service', sortOrder: 0 },
    { title: 'Recapitalizations', description: 'Helping owners take chips off the table while retaining ownership and continuing to grow with a financial or strategic partner.', category: 'sell-side', type: 'service', sortOrder: 1 },
    { title: 'Divestitures', description: 'Strategic sale of business units, subsidiaries, or divisions to optimize your portfolio and focus on core operations.', category: 'sell-side', type: 'service', sortOrder: 2 },
    { title: 'Product Line & IP Sales', description: 'Monetizing intellectual property, product lines, or technology assets through targeted sales to strategic acquirers.', category: 'sell-side', type: 'service', sortOrder: 3 },
    { title: 'Generational Transfers', description: 'Facilitating smooth transitions of family businesses to the next generation or management teams.', category: 'sell-side', type: 'service', sortOrder: 4 },

    // Sell-side process steps
    { title: 'Discovery & Preparation', description: 'We conduct a thorough assessment of your business, identify value drivers, and prepare comprehensive marketing materials.', category: 'sell-side', type: 'process-step', step: 1, sortOrder: 0 },
    { title: 'Market Outreach', description: 'Leveraging our extensive buyer network, we confidentially approach qualified strategic and financial buyers.', category: 'sell-side', type: 'process-step', step: 2, sortOrder: 1 },
    { title: 'Manage the Process', description: 'We facilitate management presentations, coordinate due diligence, and create competitive tension among buyers.', category: 'sell-side', type: 'process-step', step: 3, sortOrder: 2 },
    { title: 'Negotiate & Close', description: 'We negotiate deal terms, manage the definitive agreement process, and guide you through to a successful closing.', category: 'sell-side', type: 'process-step', step: 4, sortOrder: 3 },

    // Sell-side why choose us
    { title: 'Senior-level attention throughout the entire process', category: 'sell-side', type: 'benefit', sortOrder: 0 },
    { title: 'Extensive relationships with strategic and financial buyers', category: 'sell-side', type: 'benefit', sortOrder: 1 },
    { title: 'Track record of 200+ completed transactions', category: 'sell-side', type: 'benefit', sortOrder: 2 },
    { title: 'Deep industry expertise across multiple sectors', category: 'sell-side', type: 'benefit', sortOrder: 3 },
    { title: 'Confidential and professional approach', category: 'sell-side', type: 'benefit', sortOrder: 4 },
    { title: 'Proven ability to maximize value and deal terms', category: 'sell-side', type: 'benefit', sortOrder: 5 },

    // Buy-side services (shown on about page / homepage)
    { title: 'Acquisition Search', category: 'buy-side', type: 'service', sortOrder: 0 },
    { title: 'Sponsor Services', category: 'buy-side', type: 'service', sortOrder: 1 },
    { title: 'Buy-side Representation', category: 'buy-side', type: 'service', sortOrder: 2 },
    { title: 'Due Diligence Support', category: 'buy-side', type: 'service', sortOrder: 3 },
    { title: 'Deal Structuring', category: 'buy-side', type: 'service', sortOrder: 4 },

    // Buy-side benefits
    { title: 'A "Free Look" with a strategic buyer in the identical/similar industry', category: 'buy-side', type: 'benefit', sortOrder: 0 },
    { title: 'Gain insights and perspectives from a larger operator', category: 'buy-side', type: 'benefit', sortOrder: 1 },
    { title: 'Determine if improvements are needed before an ultimate exit', category: 'buy-side', type: 'benefit', sortOrder: 2 },
    { title: 'The timeline to closing is typically shorter', category: 'buy-side', type: 'benefit', sortOrder: 3 },
    { title: "Confidentiality is typically maintained because there's less activity", category: 'buy-side', type: 'benefit', sortOrder: 4 },

    // Buy-side disadvantages
    { title: 'Only one buyer is involved', category: 'buy-side', type: 'disadvantage', sortOrder: 0 },
    { title: 'Passing up the opportunity for multiple competing offers', category: 'buy-side', type: 'disadvantage', sortOrder: 1 },
    { title: 'Potentially missing the ultimate, highest offer', category: 'buy-side', type: 'disadvantage', sortOrder: 2 },
    { title: 'Not having an experienced M&A advisor by your side during every step', category: 'buy-side', type: 'disadvantage', sortOrder: 3 },

    // Strategic services (from about page)
    { title: 'Contract CFO', category: 'strategic', type: 'service', sortOrder: 0 },
    { title: 'Growth Strategies', category: 'strategic', type: 'service', sortOrder: 1 },
    { title: 'Optimizations', category: 'strategic', type: 'service', sortOrder: 2 },
    { title: 'Financial Modeling', category: 'strategic', type: 'service', sortOrder: 3 },
    { title: 'Market Analysis', category: 'strategic', type: 'service', sortOrder: 4 },
  ];

  for (const offering of offerings) {
    const id = generateSlug(`${offering.category}-${offering.type}-${offering.title}`);
    await prisma.serviceOffering.upsert({
      where: { id },
      update: offering,
      create: { id, ...offering },
    });
  }

  log.info(`  Seeded ${offerings.length} service offerings`);
}

async function seedAwards(): Promise<void> {
  log.info('Seeding awards...');

  const awards = [
    {
      name: 'Axial Top 10 Investment Bank 2022',
      image: 'https://fca-assets-113862367661.s3.us-east-2.amazonaws.com/awards/axial-top-10-investment-bank-2022.png',
      sortOrder: 0,
    },
    {
      name: 'Top 50 Software Axial 2023',
      image: 'https://fca-assets-113862367661.s3.us-east-2.amazonaws.com/awards/top50-software-email-2x.png',
      sortOrder: 1,
    },
    {
      name: 'Axial Top IB 2020',
      image: 'https://fca-assets-113862367661.s3.us-east-2.amazonaws.com/awards/axial-top-ib-badge-2020-359x450.png',
      sortOrder: 2,
    },
    {
      name: '2023 Axial Advisor 100',
      image: 'https://fca-assets-113862367661.s3.us-east-2.amazonaws.com/awards/2023-axial-advisor-100.png',
      sortOrder: 3,
    },
    {
      name: 'NFPA Member',
      image: 'https://fca-assets-113862367661.s3.us-east-2.amazonaws.com/awards/nfpa-member.png',
      sortOrder: 4,
    },
  ];

  for (const award of awards) {
    await prisma.award.upsert({
      where: { id: generateSlug(award.name) },
      update: award,
      create: {
        id: generateSlug(award.name),
        ...award,
      },
    });
  }

  log.info(`  Seeded ${awards.length} awards`);
}

async function seedPageContent(): Promise<void> {
  log.info('Seeding page content...');

  const pages = [
    {
      pageKey: 'home',
      title: 'Let us help you overshoot your goals.',
      content: '',
      metadata: {
        metaTitle: 'Middle Market M&A Investment Bank',
        metaDescription: 'Flatirons Capital Advisors is a North American mergers and acquisitions advisory firm specializing in lower middle-market transactions. Over 200 completed transactions.',
        subtitle: 'Middle Market M&A Advisory',
        description: 'Flatirons Capital Advisors is a North American mergers and acquisitions advisory firm focused on privately-held, lower middle-market companies.',
        heroImage: 'https://fca-assets-113862367661.s3.us-east-2.amazonaws.com/hero/flatironsherowinter.jpg',
        ctaText: 'Start a Conversation',
        ctaHref: '/contact',
        secondaryCtaText: 'View Transactions',
        secondaryCtaHref: '/transactions',
        bottomCtaTitle: 'Ready to discuss your options?',
        bottomCtaDescription: 'With an exclusive focus on private businesses, we understand the challenges private business owners face. Our hands-on approach ensures personalized attention throughout the entire process.',
        bottomCtaText: 'Contact Us Today',
        bottomCtaHref: '/contact',
        buySideDescription: 'If your organization is considering an acquisition, leveraged buyout, joint venture, or alliance, Flatirons can support your search with a complete range of buy-side advisory services.',
        sellSideDescription: "The focus of our sell-side advisory approach is on helping you make the right strategic moves to protect what you've built through years of hard work and sacrifice.",
        strategicDescription: 'Strategy and business plan consulting from contract CFO and growth strategies to optimizations. We work with everyone from startups to Fortune 1000 public companies.',
        servicesSubtitle: 'What We Do',
        servicesTitle: 'M&A Services',
        servicesDescription: 'Comprehensive mergers and acquisitions advisory services for lower middle-market companies.',
        transactionsSubtitle: 'Track Record',
        transactionsTitle: 'Recent Transactions',
        transactionsDescription: 'When it comes to closing a transaction, our clients value our advice, expertise and execution.',
      },
    },
    {
      pageKey: 'about',
      title: 'About Flatirons Capital Advisors',
      content: `Flatirons Capital Advisors is a leading mergers and acquisitions advisor to lower middle-market companies.

Our buyer relationships are crucial to our ongoing success in making markets for our clients and completing transactions in record time. We are constantly updating our key industry and investment criteria based on real-time feedback from our vast network of public and private buyers.

The deal process is 100% managed by a senior team member and not pushed down to a junior analyst. This hands-on approach ensures a strategic and robust process for our clients.`,
      metadata: {
        metaDescription: 'Flatirons Capital Advisors is a leading mergers and acquisitions advisor to lower middle-market companies with decades of transaction advisory experience.',
        heroDescription: 'With decades of transaction advisory experience, our founders identified a growing need to bring together a more comprehensive suite of professional resources.',
        companyHeading: 'Flatirons Capital Advisors',
        servicesSubtitle: 'Our Services',
        servicesTitle: 'Mergers & Acquisitions',
        servicesDescription: "The focus of our advisory services is to help you make the right strategic moves to protect what you've built.",
        buySideHeading: 'Buy-side Advisory',
        buySideDescription: 'If your organization is considering an acquisition, leveraged buyout, joint venture, or alliance, Flatirons can support your search with a complete range of buy-side advisory services.',
        sellSideHeading: 'Sell-side Advisory',
        sellSideDescription: "The focus of our sell-side advisory approach is on helping you make the right strategic moves to protect what you've built through years of hard work and sacrifice.",
        strategicHeading: 'Strategic Consulting',
        strategicDescription: 'Strategy and business plan consulting from contract CFO and growth strategies to optimizations. We work with everyone from startups to Fortune 1000 public companies.',
        targetSubtitle: 'Target Profile',
        targetTitle: 'Industry Focus & Investment Criteria',
        financialCriteriaHeading: 'Financial Criteria',
        financialCriteria: 'EBITDA greater than $2.0M\nNo minimal EBITDA requirement for add-on acquisitions\nIncreasing revenue',
        otherCriteriaHeading: 'Other Criteria',
        otherCriteria: 'Strong 2nd tier management\nCustomer & revenue diversification\nCompetitive differentiation & healthy growth potential',
        industrySectorsHeading: 'Industry Sectors',
        valuesSubtitle: 'Our Principles',
        valuesTitle: 'Core Values',
        ctaTitle: 'Let us help you overshoot your goals.',
        ctaDescription: "Whether you're looking to sell your business, acquire a company, or need strategic advice, our experienced team is here to guide you through every step.",
        ctaText: 'Contact Us Today',
      },
    },
    {
      pageKey: 'privacy-policy',
      title: 'Privacy Policy',
      metadata: {
        metaDescription: 'Privacy Policy for Flatirons Capital Advisors. Learn how we collect, use, and protect your personal information.',
      },
      content: `Last updated: January 2026

## Introduction

Flatirons Capital Advisors, LLC ("we," "our," or "us") respects your privacy and is committed to protecting your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website or engage our services.

## Information We Collect

We may collect information about you in a variety of ways, including:

- **Personal Data:** Personally identifiable information, such as your name, email address, telephone number, and company information that you voluntarily give to us when you contact us or engage our services.
- **Derivative Data:** Information our servers automatically collect when you access the website, such as your IP address, browser type, operating system, access times, and pages viewed.
- **Financial Data:** Financial information related to potential transactions that you provide to us in the course of our advisory services.

## Use of Your Information

We may use information collected about you to:

- Provide, operate, and maintain our services
- Respond to your inquiries and fulfill your requests
- Send you marketing and promotional communications
- Improve our website and services
- Comply with legal obligations

## Disclosure of Your Information

We may share information we have collected about you in certain situations. Your information may be disclosed as follows:

- **By Law or to Protect Rights:** If we believe the release of information is necessary to respond to legal process or to protect the rights, property, and safety of others.
- **Business Transfers:** In connection with any merger, sale of company assets, financing, or acquisition of all or a portion of our business.
- **With Your Consent:** We may disclose your personal information for any other purpose with your consent.

## Security of Your Information

We use administrative, technical, and physical security measures to help protect your personal information. While we have taken reasonable steps to secure the personal information you provide to us, please be aware that no security measures are perfect or impenetrable.

## Contact Us

If you have questions or comments about this Privacy Policy, please contact us at info@flatironscap.com or call 303.319.4540.`,
    },
    {
      pageKey: 'sell-side',
      title: 'Sell-Side M&A Advisory',
      content: `At Flatirons Capital Advisors, we understand that selling your business is one of the most significant decisions you'll make. Our sell-side advisory services are designed to guide you through every step of the process, ensuring you achieve the best possible outcome while protecting what you've built.

With decades of experience and a hands-on approach from senior team members, we create competitive processes that attract the right buyers and maximize value for our clients.

---

Our buyer relationships are crucial to our ongoing success in making markets for our clients and completing transactions in record time. The deal process is 100% managed by a senior team member and not pushed down to a junior analyst.`,
      metadata: {
        metaDescription: 'Sell-side M&A advisory services from Flatirons Capital Advisors. Private company exits, recapitalizations, divestitures, and generational transfers for business owners.',
        subtitle: 'Maximize Your Exit',
        description: "The focus of our sell-side advisory approach is on helping you make the right strategic moves to protect what you've built through years of hard work and sacrifice.",
        servicesSubtitle: 'What We Offer',
        servicesTitle: 'Sell-Side Services',
        servicesDescription: 'Comprehensive advisory services tailored to your specific situation and goals.',
        processSubtitle: 'How We Work',
        processTitle: 'Our Proven Process',
        processDescription: 'A structured approach that has delivered results for over 200 transactions.',
        advantageTitle: 'The Flatirons Advantage',
        advantageSubtitle: 'Why Choose Flatirons?',
        ctaTitle: 'Ready to explore your options?',
        ctaDescription: "Contact us for a confidential conversation about your business and goals. We'll help you understand what's possible.",
        ctaText: 'Contact Us Today',
        whyChooseUs: 'Senior-level attention throughout the entire process\nExtensive relationships with strategic and financial buyers\nTrack record of 200+ completed transactions\nDeep industry expertise across multiple sectors\nConfidential and professional approach\nProven ability to maximize value and deal terms',
      },
    },
    {
      pageKey: 'buy-side',
      title: 'Buy-Side M&A Advisory',
      content: `Flatirons Capital Advisors loves finding the simplest, shortest and most efficient solutions for our clients' desired outcomes. With our extensive knowledge of a broad range of industries and expansive relationships with strategic buyers across North America, in certain situations a possible solution for a business owner looking to retire or take some chips off the table is to take a buy-side approach to the sale.

---

Whether it's a buy-side or sell-side engagement, a key part of Flatirons Capital Advisors' expertise lies with identifying and maintaining relationships with key strategic buyers that have the cash on hand and are actively acquiring businesses in the same industry as the business owner's operations.

This reduces the chances of deal fatigue and any surprises the buyer might have if they didn't intimately understand the owner's business/industry.

The due diligence process/timeline is usually more efficient because the buyer understands the industry/business operations, thus reducing friction points and the time to close. Further, it elevates the chances of a successful post-merger integration.

Finally, the business owner can feel confident with the ultimate sale price because in this highly competitive market these buyers understand they must present strong, fair-market-values up front in order to consistently complete acquisitions.`,
      metadata: {
        metaDescription: 'Buy-side M&A advisory services from Flatirons Capital Advisors. Acquisition search, sponsor services, and buy-side representation for strategic buyers.',
        subtitle: 'A Free Look',
        description: "Finding the simplest, shortest and most efficient solutions for our clients' desired outcomes.",
        processHeading: 'Understanding the Process',
        benefitsHeading: 'Potential Benefits to the Business Owner',
        disadvantagesHeading: 'Key Disadvantages to the Business Owner',
        approachSubtitle: 'How We Work',
        approachTitle: 'Our Approach',
        processBullets: "The buyer is our client and pays our fees\nA high-level description of the business owner's operations is required\nA 30-minute conference call takes place to determine if next steps are warranted",
        ctaTitle: 'Interested in a buy-side approach?',
        ctaDescription: 'Contact us to discuss whether a buy-side engagement might be the right fit for your situation.',
        ctaText: 'Contact Us',
      },
    },
    {
      pageKey: 'team',
      title: 'Excellence is our foundation.',
      content: '',
      metadata: {
        metaDescription: 'Meet the leadership team at Flatirons Capital Advisors. Our experienced M&A professionals bring decades of transaction advisory expertise.',
        description: 'Our senior team members ensure a strategic and robust process for every client. The deal process is 100% managed by experienced professionals.',
        leadershipSubtitle: 'Our People',
        leadershipTitle: 'Leadership Team',
        leadershipDescription: 'With decades of transaction advisory experience, our leadership team brings unparalleled expertise to every engagement.',
        analystSubtitle: 'Supporting Team',
        analystTitle: 'Analysts',
        communitySubtitle: 'Giving Back',
        communityTitle: 'Community Service',
        communityDescription: 'The entire team at Flatirons Capital Advisors loves giving back to the community.',
        ctaTitle: 'Want to work with our team?',
        ctaDescription: 'Contact us to discuss how our experienced professionals can help you achieve your transaction goals.',
        ctaText: 'Contact Us',
      },
    },
    {
      pageKey: 'faq',
      title: 'Frequently Asked Questions',
      content: '',
      metadata: {
        metaDescription: 'Frequently asked questions about M&A transactions, business valuation, and working with Flatirons Capital Advisors.',
        description: 'Common questions about M&A transactions, business valuation, and working with our team.',
        ctaTitle: 'Have more questions?',
        ctaDescription: 'Our team is here to help. Reach out to discuss your specific situation and how we can assist.',
        ctaText: 'Contact Us',
      },
    },
    {
      pageKey: 'contact',
      title: "We'd love to hear from you!",
      content: '',
      metadata: {
        metaDescription: 'Contact Flatirons Capital Advisors for M&A advisory services. Offices in Denver, Dallas, Miami, and Chicago. Call 303.319.4540.',
        description: "Let's explore how we can help you achieve your goals.",
      },
    },
    {
      pageKey: 'transactions',
      title: 'Completed Transactions',
      content: '',
      metadata: {
        metaDescription: 'View our completed M&A transactions. Flatirons Capital Advisors has successfully completed over 200 transactions across multiple industries.',
        subtitle: 'Strategic Advice | Process Driven™',
        description: 'When it comes to closing a transaction, our clients value our advice, expertise and execution. Our commitment to excellence has allowed us to deliver world-class results.',
        sectionSubtitle: 'Track Record',
        sectionDescription: 'Our commitment to excellence has allowed us to deliver world-class results to the middle and lower middle markets.',
        ctaTitle: 'Ready to add your company to this list?',
        ctaDescription: 'Let us help you achieve your transaction goals with the same expertise and dedication we bring to every engagement.',
        ctaText: 'Contact Us Today',
      },
    },
    {
      pageKey: 'news',
      title: 'News & Insights',
      content: '',
      metadata: {
        metaDescription: 'Latest news, transaction announcements, and insights from Flatirons Capital Advisors. Stay updated on M&A activity in the lower middle market.',
        subtitle: 'Recent Transaction Announcements',
        description: 'Stay updated on our latest M&A transactions and industry insights.',
        sectionSubtitle: 'Latest Updates',
        sectionTitle: 'Recent Announcements',
        ctaTitle: 'Have a transaction to announce?',
        ctaDescription: 'Let us help you share your success story with the business community.',
        ctaText: 'Contact Us Today',
      },
    },
    {
      pageKey: 'resources',
      title: 'Resources',
      content: '',
      metadata: {
        metaDescription: 'M&A resources and guides for business owners. Learn about selling your business, recapitalizations, exit planning, and more.',
        subtitle: 'M&A Guides & Articles',
        description: 'Featured articles and guides for business owners considering M&A transactions.',
        sectionSubtitle: 'Expert Insights',
        sectionTitle: 'Articles for Business Owners',
        ctaTitle: 'Have questions about selling your business?',
        ctaDescription: 'Our team is here to help guide you through the process.',
        ctaText: 'Contact Us',
      },
    },
  ];

  for (const page of pages) {
    await prisma.pageContent.upsert({
      where: { pageKey: page.pageKey },
      update: {
        title: page.title,
        content: page.content,
        metadata: page.metadata,
      },
      create: page,
    });
  }

  log.info(`  Seeded ${pages.length} page content records`);
}

// ============================================
// MAIN
// ============================================

async function main(): Promise<void> {
  log.info('Starting database seed...\n');

  try {
    await seedSiteConfig();
    await seedContentTags();
    await seedAssets();
    await seedTombstones();
    await seedBlogPosts();
    await linkPressReleases();
    await seedTeamMembers();
    await seedCommunityServices();
    await seedFAQs();
    await seedCoreValues();
    await seedIndustrySectors();
    await seedServiceOfferings();
    await seedAwards();
    await seedPageContent();

    log.info('\nDatabase seed completed successfully!');
  } catch (error) {
    log.error('Seed failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();
