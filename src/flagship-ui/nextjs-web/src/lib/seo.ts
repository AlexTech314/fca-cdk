import type { Metadata } from 'next';
import { fetchSiteConfig, toAssetUrl } from './utils';
import { getTagBySlug } from './api';

/**
 * State code to full name mapping
 */
export const stateNames: Record<string, string> = {
  'AL': 'Alabama',
  'AK': 'Alaska',
  'AZ': 'Arizona',
  'AR': 'Arkansas',
  'CA': 'California',
  'CO': 'Colorado',
  'CT': 'Connecticut',
  'DE': 'Delaware',
  'FL': 'Florida',
  'GA': 'Georgia',
  'HI': 'Hawaii',
  'ID': 'Idaho',
  'IL': 'Illinois',
  'IN': 'Indiana',
  'IA': 'Iowa',
  'KS': 'Kansas',
  'KY': 'Kentucky',
  'LA': 'Louisiana',
  'ME': 'Maine',
  'MD': 'Maryland',
  'MA': 'Massachusetts',
  'MI': 'Michigan',
  'MN': 'Minnesota',
  'MS': 'Mississippi',
  'MO': 'Missouri',
  'MT': 'Montana',
  'NE': 'Nebraska',
  'NV': 'Nevada',
  'NH': 'New Hampshire',
  'NJ': 'New Jersey',
  'NM': 'New Mexico',
  'NY': 'New York',
  'NC': 'North Carolina',
  'ND': 'North Dakota',
  'OH': 'Ohio',
  'OK': 'Oklahoma',
  'OR': 'Oregon',
  'PA': 'Pennsylvania',
  'RI': 'Rhode Island',
  'SC': 'South Carolina',
  'SD': 'South Dakota',
  'TN': 'Tennessee',
  'TX': 'Texas',
  'UT': 'Utah',
  'VT': 'Vermont',
  'VA': 'Virginia',
  'WA': 'Washington',
  'WV': 'West Virginia',
  'WI': 'Wisconsin',
  'WY': 'Wyoming',
  'DC': 'Washington D.C.',
};

/**
 * Get full state name from code
 */
export function getStateName(stateCode: string): string {
  return stateNames[stateCode.toUpperCase()] || stateCode;
}

/**
 * Format tag slug for display (capitalize words)
 */
export function formatTagName(tag: string): string {
  return tag.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

/**
 * Get tag display name from API, with slug-based fallback
 */
export async function getTagDisplayName(slug: string): Promise<string> {
  const tag = await getTagBySlug(slug);
  return tag?.name || formatTagName(slug);
}

/**
 * Get tag description from API
 */
export async function getTagDescription(slug: string): Promise<string | null> {
  const tag = await getTagBySlug(slug);
  return tag?.description || null;
}

/**
 * Grouping page types
 */
export type GroupingType = 'tag' | 'state' | 'city' | 'year' | 'news-tag';

/**
 * Generate SEO-optimized metadata for grouping pages
 */
export async function generateGroupingMetadata(
  type: GroupingType,
  value: string,
  count: number,
  additionalContext?: { state?: string }
): Promise<Metadata> {
  const config = await fetchSiteConfig();
  const ogImageUrl = toAssetUrl(config.ogImage) || config.ogImage;
  let title: string;
  let description: string;
  let canonicalPath: string;

  // Fetch tag data from API if needed
  const tagData = (type === 'tag' || type === 'news-tag') ? await getTagBySlug(value) : null;
  const tagName = tagData?.name || formatTagName(value);

  switch (type) {
    case 'tag':
      title = `${tagName} M&A Transactions (${count} Deals)`;
      description = tagData?.description 
        ? tagData.description.slice(0, 155) + '...'
        : `Browse ${count} completed ${tagName.toLowerCase()} M&A transactions. ${config.name} specializes in lower middle-market mergers and acquisitions.`;
      canonicalPath = `/transactions/tag/${value}`;
      break;

    case 'state':
      const stateName = getStateName(value);
      title = `${stateName} M&A Transactions`;
      description = `Explore ${count} completed M&A transactions in ${stateName}. ${config.name} is a trusted M&A advisor in the lower middle-market.`;
      canonicalPath = `/transactions/state/${value.toLowerCase()}`;
      break;

    case 'city':
      const cityDisplay = formatTagName(value);
      const stateDisplay = additionalContext?.state ? `, ${getStateName(additionalContext.state)}` : '';
      title = `${cityDisplay}${stateDisplay} M&A Deals`;
      description = `View ${count} completed M&A transactions in ${cityDisplay}${stateDisplay}. Expert sell-side and buy-side advisory from ${config.name}.`;
      canonicalPath = `/transactions/city/${value}`;
      break;

    case 'year':
      title = `${value} Completed Transactions`;
      description = `Review ${count} M&A transactions completed in ${value}. See our track record of successful deals at ${config.name}.`;
      canonicalPath = `/transactions/year/${value}`;
      break;

    case 'news-tag':
      title = `${tagName} News & Insights (${count} Articles)`;
      description = tagData?.description 
        ? tagData.description.slice(0, 155) + '...'
        : `Read ${count} news articles and insights about ${tagName.toLowerCase()} from ${config.name}, a leading M&A advisory firm.`;
      canonicalPath = `/news/tag/${value}`;
      break;

    default:
      title = 'M&A Transactions';
      description = config.description;
      canonicalPath = '/transactions';
  }

  // OG/Twitter titles need the full brand since they don't use Next.js title.template
  const ogTitle = `${title} | ${config.name}`;

  return {
    title,
    description,
    alternates: {
      canonical: `${config.url}${canonicalPath}`,
    },
    openGraph: {
      title: ogTitle,
      description,
      url: `${config.url}${canonicalPath}`,
      type: 'website',
      siteName: config.name,
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: config.name,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: ogTitle,
      description,
    },
  };
}

/**
 * Breadcrumb item interface
 */
export interface BreadcrumbItem {
  name: string;
  url?: string;
}

/**
 * Generate JSON-LD BreadcrumbList schema
 */
export async function generateBreadcrumbSchema(items: BreadcrumbItem[]): Promise<object> {
  const config = await fetchSiteConfig();
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      ...(item.url && { item: `${config.url}${item.url}` }),
    })),
  };
}

/**
 * Generate JSON-LD CollectionPage schema for grouping pages
 */
export async function generateCollectionPageSchema(params: {
  name: string;
  description: string;
  url: string;
  numberOfItems: number;
}): Promise<object> {
  const config = await fetchSiteConfig();
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: params.name,
    description: params.description,
    url: `${config.url}${params.url}`,
    numberOfItems: params.numberOfItems,
    provider: {
      '@type': 'Organization',
      name: config.name,
      url: config.url,
    },
  };
}

/**
 * Generate combined JSON-LD schema for a grouping page
 */
export async function generateGroupingPageSchema(params: {
  type: GroupingType;
  value: string;
  displayName: string;
  count: number;
  breadcrumbs: BreadcrumbItem[];
}): Promise<string> {
  const { type, value, displayName, count, breadcrumbs } = params;
  
  let url: string;
  let description: string;
  
  switch (type) {
    case 'tag':
      url = `/transactions/tag/${value}`;
      description = `${displayName} M&A transactions from ${(await fetchSiteConfig()).name}`;
      break;
    case 'state':
      url = `/transactions/state/${value.toLowerCase()}`;
      description = `M&A transactions in ${displayName}`;
      break;
    case 'city':
      url = `/transactions/city/${value}`;
      description = `M&A transactions in ${displayName}`;
      break;
    case 'year':
      url = `/transactions/year/${value}`;
      description = `M&A transactions completed in ${value}`;
      break;
    case 'news-tag':
      url = `/news/tag/${value}`;
      description = `${displayName} news and insights`;
      break;
    default:
      url = '/transactions';
      description = 'M&A transactions';
  }

  const schemas = [
    await generateBreadcrumbSchema(breadcrumbs),
    await generateCollectionPageSchema({
      name: displayName,
      description,
      url,
      numberOfItems: count,
    }),
  ];

  return JSON.stringify(schemas);
}
