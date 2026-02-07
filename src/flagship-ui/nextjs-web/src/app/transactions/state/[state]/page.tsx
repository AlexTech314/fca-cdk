import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import {
  getAllStates,
  getTombstonesByState,
  cityToSlug,
  getAllTombstoneTags,
  getAllCities,
  getAllTransactionYears,
  getNewsArticlesByTag,
} from '@/lib/data';
import type { NewsArticle } from '@/lib/types';
import {
  getStateName,
  generateGroupingMetadata,
  generateGroupingPageSchema,
} from '@/lib/seo';
import { TransactionsGroupingPage } from '@/components/transactions/TransactionsGroupingPage';

interface PageProps {
  params: Promise<{ state: string }>;
}

export async function generateStaticParams() {
  const states = await getAllStates();
  return states.map((state) => ({ state: state.toLowerCase() }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { state } = await params;
  const tombstones = await getTombstonesByState(state);

  if (tombstones.length === 0) {
    return { title: 'State Not Found' };
  }

  return generateGroupingMetadata(
    'state',
    state.toUpperCase(),
    tombstones.length
  );
}

async function getRelatedNewsFromTombstones(tombstones: { tags?: string[] }[]) {
  const uniqueTags = [...new Set(tombstones.flatMap((t) => t.tags || []))];
  const newsResults = await Promise.all(
    uniqueTags.map((tag) => getNewsArticlesByTag(tag))
  );
  const seenSlugs = new Set<string>();
  const relatedNews: NewsArticle[] = [];
  for (const articles of newsResults) {
    for (const article of articles) {
      if (!seenSlugs.has(article.slug)) {
        seenSlugs.add(article.slug);
        relatedNews.push(article);
      }
    }
  }
  relatedNews.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  return relatedNews;
}

export default async function TransactionsByStatePage({ params }: PageProps) {
  const { state } = await params;
  const tombstones = await getTombstonesByState(state);

  if (tombstones.length === 0) {
    notFound();
  }

  const stateName = getStateName(state);
  const breadcrumbs = [
    { name: 'Home', url: '/' },
    { name: 'Transactions', url: '/transactions' },
    { name: stateName },
  ];

  const schema = await generateGroupingPageSchema({
    type: 'state',
    value: state.toUpperCase(),
    displayName: stateName,
    count: tombstones.length,
    breadcrumbs,
  });

  const citiesInState = [
    ...new Set(tombstones.map((t) => t.city).filter(Boolean)),
  ].sort() as string[];

  const [tags, states, cities, years, relatedNews] = await Promise.all([
    getAllTombstoneTags(),
    getAllStates(),
    getAllCities(),
    getAllTransactionYears(),
    getRelatedNewsFromTombstones(tombstones),
  ]);

  return (
    <TransactionsGroupingPage
      schema={schema}
      breadcrumbs={breadcrumbs}
      filter={{ type: 'state', value: state.toUpperCase() }}
      displayName={stateName}
      tombstones={tombstones}
      tags={tags}
      states={states}
      cities={cities}
      years={years}
      relatedNews={relatedNews}
      cityFilter={{
        cities: citiesInState,
        cityToHref: (city) => `/transactions/city/${cityToSlug(city)}`,
      }}
    />
  );
}
