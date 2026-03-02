import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import {
  getTombstoneFilterOptions,
  getTombstonesByIndustry,
  getNewsArticlesByIndustry,
} from '@/lib/data';
import { fetchSiteConfig } from '@/lib/utils';
import { formatSlug, generateGroupingMetadata, generateGroupingPageSchema } from '@/lib/seo';
import { TransactionsGroupingPage } from '@/components/transactions/TransactionsGroupingPage';

interface PageProps {
  params: Promise<{ industry: string }>;
}

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { industry } = await params;
  const tombstones = await getTombstonesByIndustry(industry);

  if (tombstones.length === 0) {
    return { title: 'Industry Not Found' };
  }

  return generateGroupingMetadata('industry', industry, tombstones.length);
}

export default async function TransactionsByIndustryPage({ params }: PageProps) {
  const { industry } = await params;
  const tombstones = await getTombstonesByIndustry(industry);

  if (tombstones.length === 0) {
    notFound();
  }

  const displayName = formatSlug(industry);
  const breadcrumbs = [
    { name: 'Home', url: '/' },
    { name: 'Transactions', url: '/transactions' },
    { name: displayName },
  ];

  const schema = await generateGroupingPageSchema({
    type: 'industry',
    value: industry,
    displayName,
    count: tombstones.length,
    breadcrumbs,
  });

  const [filters, relatedNews, config] = await Promise.all([
    getTombstoneFilterOptions(),
    getNewsArticlesByIndustry(industry),
    fetchSiteConfig(),
  ]);

  return (
    <TransactionsGroupingPage
      schema={schema}
      breadcrumbs={breadcrumbs}
      filter={{ type: 'industry', value: industry }}
      displayName={displayName}
      companyName={config.name}
      tombstones={tombstones}
      industries={filters.industries}
      states={filters.states}
      cities={filters.cities}
      years={filters.years}
      relatedNews={relatedNews}
      relatedNewsViewAllHref={`/news/industry/${industry}`}
      relatedNewsViewAllText={`View all ${relatedNews.length} related articles →`}
    />
  );
}
