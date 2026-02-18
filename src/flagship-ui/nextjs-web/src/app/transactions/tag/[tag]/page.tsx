import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import {
  getTombstoneFilterOptions,
  getTombstonesByTag,
  getNewsArticlesByTag,
} from '@/lib/data';
import { fetchSiteConfig } from '@/lib/utils';
import { formatTagName, generateGroupingMetadata, generateGroupingPageSchema } from '@/lib/seo';
import { TransactionsGroupingPage } from '@/components/transactions/TransactionsGroupingPage';

interface PageProps {
  params: Promise<{ tag: string }>;
}

export async function generateStaticParams() {
  const filters = await getTombstoneFilterOptions();
  return filters.tags.map((t) => ({ tag: t.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { tag } = await params;
  const tombstones = await getTombstonesByTag(tag);

  if (tombstones.length === 0) {
    return { title: 'Tag Not Found' };
  }

  return generateGroupingMetadata('tag', tag, tombstones.length);
}

export default async function TransactionsByTagPage({ params }: PageProps) {
  const { tag } = await params;
  const tombstones = await getTombstonesByTag(tag);

  if (tombstones.length === 0) {
    notFound();
  }

  const displayName = formatTagName(tag);
  const breadcrumbs = [
    { name: 'Home', url: '/' },
    { name: 'Transactions', url: '/transactions' },
    { name: displayName },
  ];

  const schema = await generateGroupingPageSchema({
    type: 'tag',
    value: tag,
    displayName,
    count: tombstones.length,
    breadcrumbs,
  });

  const [filters, relatedNews, config] = await Promise.all([
    getTombstoneFilterOptions(),
    getNewsArticlesByTag(tag),
    fetchSiteConfig(),
  ]);

  return (
    <TransactionsGroupingPage
      schema={schema}
      breadcrumbs={breadcrumbs}
      filter={{ type: 'tag', value: tag }}
      displayName={displayName}
      companyName={config.name}
      tombstones={tombstones}
      tags={filters.tags.map((t) => t.slug)}
      states={filters.states}
      cities={filters.cities}
      years={filters.years}
      relatedNews={relatedNews}
      relatedNewsViewAllHref={`/news/tag/${tag}`}
      relatedNewsViewAllText={`View all ${relatedNews.length} related articles →`}
    />
  );
}
