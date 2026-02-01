import type { Metadata } from 'next';
import { siteConfig } from './utils';
import { getTagDisplayName as getTaxonomyTagName, TAG_MAP } from './taxonomy';

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
 * Format tag name for display using taxonomy
 */
export function formatTagName(tag: string): string {
  return getTaxonomyTagName(tag);
}

/**
 * Grouping page types
 */
export type GroupingType = 'tag' | 'state' | 'city' | 'year' | 'news-tag';

/**
 * Generate SEO-optimized metadata for grouping pages
 */
export function generateGroupingMetadata(
  type: GroupingType,
  value: string,
  count: number,
  additionalContext?: { state?: string }
): Metadata {
  let title: string;
  let description: string;
  let canonicalPath: string;

  switch (type) {
    case 'tag':
      title = `${formatTagName(value)} M&A Transactions (${count} Deals) | Flatirons Capital`;
      // Use taxonomy description if available, otherwise generate generic one
      const tagDef = TAG_MAP[value];
      description = tagDef?.description 
        ? tagDef.description.slice(0, 155) + '...'
        : `Browse ${count} completed ${formatTagName(value).toLowerCase()} M&A transactions. Flatirons Capital Advisors specializes in lower middle-market mergers and acquisitions.`;
      canonicalPath = `/transactions/tag/${value}`;
      break;

    case 'state':
      const stateName = getStateName(value);
      title = `${stateName} M&A Transactions | Flatirons Capital`;
      description = `Explore ${count} completed M&A transactions in ${stateName}. Flatirons Capital Advisors is a trusted M&A advisor in the lower middle-market.`;
      canonicalPath = `/transactions/state/${value.toLowerCase()}`;
      break;

    case 'city':
      const cityDisplay = formatTagName(value);
      const stateDisplay = additionalContext?.state ? `, ${getStateName(additionalContext.state)}` : '';
      title = `${cityDisplay}${stateDisplay} M&A Deals | Flatirons Capital`;
      description = `View ${count} completed M&A transactions in ${cityDisplay}${stateDisplay}. Expert sell-side and buy-side advisory from Flatirons Capital Advisors.`;
      canonicalPath = `/transactions/city/${value}`;
      break;

    case 'year':
      title = `${value} Completed Transactions | Flatirons Capital`;
      description = `Review ${count} M&A transactions completed in ${value}. See our track record of successful deals at Flatirons Capital Advisors.`;
      canonicalPath = `/transactions/year/${value}`;
      break;

    case 'news-tag':
      title = `${formatTagName(value)} News & Insights (${count} Articles) | Flatirons Capital`;
      // Use taxonomy description if available for news tags too
      const newsTagDef = TAG_MAP[value];
      description = newsTagDef?.description 
        ? newsTagDef.description.slice(0, 155) + '...'
        : `Read ${count} news articles and insights about ${formatTagName(value).toLowerCase()} from Flatirons Capital Advisors, a leading M&A advisory firm.`;
      canonicalPath = `/news/tag/${value}`;
      break;

    default:
      title = `M&A Transactions | Flatirons Capital Advisors`;
      description = siteConfig.description;
      canonicalPath = '/transactions';
  }

  return {
    title,
    description,
    alternates: {
      canonical: `${siteConfig.url}${canonicalPath}`,
    },
    openGraph: {
      title,
      description,
      url: `${siteConfig.url}${canonicalPath}`,
      type: 'website',
      siteName: siteConfig.name,
      images: [
        {
          url: `${siteConfig.url}${siteConfig.ogImage}`,
          width: 1200,
          height: 630,
          alt: siteConfig.name,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
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
export function generateBreadcrumbSchema(items: BreadcrumbItem[]): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      ...(item.url && { item: `${siteConfig.url}${item.url}` }),
    })),
  };
}

/**
 * Generate JSON-LD CollectionPage schema for grouping pages
 */
export function generateCollectionPageSchema(params: {
  name: string;
  description: string;
  url: string;
  numberOfItems: number;
}): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: params.name,
    description: params.description,
    url: `${siteConfig.url}${params.url}`,
    numberOfItems: params.numberOfItems,
    provider: {
      '@type': 'Organization',
      name: siteConfig.name,
      url: siteConfig.url,
    },
  };
}

/**
 * Generate combined JSON-LD schema for a grouping page
 */
export function generateGroupingPageSchema(params: {
  type: GroupingType;
  value: string;
  displayName: string;
  count: number;
  breadcrumbs: BreadcrumbItem[];
}): string {
  const { type, value, displayName, count, breadcrumbs } = params;
  
  let url: string;
  let description: string;
  
  switch (type) {
    case 'tag':
      url = `/transactions/tag/${value}`;
      description = `${displayName} M&A transactions from Flatirons Capital Advisors`;
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
    generateBreadcrumbSchema(breadcrumbs),
    generateCollectionPageSchema({
      name: displayName,
      description,
      url,
      numberOfItems: count,
    }),
  ];

  return JSON.stringify(schemas);
}
