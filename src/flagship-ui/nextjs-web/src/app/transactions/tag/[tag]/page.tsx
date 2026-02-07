import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import {
  getAllTombstoneTags,
  getTombstonesByTag,
  getAllStates,
  getAllCities,
  getAllTransactionYears,
  getNewsArticlesByTag,
} from '@/lib/data';
import { formatTagName, generateGroupingMetadata, generateGroupingPageSchema } from '@/lib/seo';
import { TransactionsGroupingPage } from '@/components/transactions/TransactionsGroupingPage';

interface PageProps {
  params: Promise<{ tag: string }>;
}

export async function generateStaticParams() {
  const tags = await getAllTombstoneTags();
  return tags.map((tag) => ({ tag }));
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

  const [tags, states, cities, years, relatedNews] = await Promise.all([
    getAllTombstoneTags(),
    getAllStates(),
    getAllCities(),
    getAllTransactionYears(),
    getNewsArticlesByTag(tag),
  ]);

  return (
    <TransactionsGroupingPage
      schema={schema}
      breadcrumbs={breadcrumbs}
      filter={{ type: 'tag', value: tag }}
      displayName={displayName}
      tombstones={tombstones}
      tags={tags}
      states={states}
      cities={cities}
      years={years}
      relatedNews={relatedNews}
      relatedNewsViewAllHref={`/news/tag/${tag}`}
      relatedNewsViewAllText={`View all ${relatedNews.length} related articles →`}
    />
  );
}
