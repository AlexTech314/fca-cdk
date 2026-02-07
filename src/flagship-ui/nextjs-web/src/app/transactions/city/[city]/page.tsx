import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import {
  getAllCities,
  getTombstonesByCity,
  cityToSlug,
  slugToCity,
  getAllTombstoneTags,
  getAllStates,
  getAllTransactionYears,
  getNewsArticlesByTag,
} from '@/lib/data';
import type { NewsArticle } from '@/lib/types';
import { fetchSiteConfig } from '@/lib/utils';
import {
  getStateName,
  generateGroupingMetadata,
  generateGroupingPageSchema,
} from '@/lib/seo';
import { TransactionsGroupingPage } from '@/components/transactions/TransactionsGroupingPage';

interface PageProps {
  params: Promise<{ city: string }>;
}

export async function generateStaticParams() {
  const cities = await getAllCities();
  return cities.map((city) => ({ city: cityToSlug(city) }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { city } = await params;
  const tombstones = await getTombstonesByCity(city);

  if (tombstones.length === 0) {
    return { title: 'City Not Found' };
  }

  const stateCode = tombstones[0]?.state || undefined;
  return generateGroupingMetadata('city', city, tombstones.length, {
    state: stateCode,
  });
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

export default async function TransactionsByCityPage({ params }: PageProps) {
  const { city } = await params;
  const tombstones = await getTombstonesByCity(city);

  if (tombstones.length === 0) {
    notFound();
  }

  const cityName = slugToCity(city);
  const stateCode = tombstones[0]?.state || '';
  const stateName = getStateName(stateCode);
  const displayName = stateCode ? `${cityName}, ${stateName}` : cityName;

  const breadcrumbs = [
    { name: 'Home', url: '/' },
    { name: 'Transactions', url: '/transactions' },
    ...(stateCode
      ? [{ name: stateName, url: `/transactions/state/${stateCode.toLowerCase()}` }]
      : []),
    { name: cityName },
  ];

  const schema = await generateGroupingPageSchema({
    type: 'city',
    value: city,
    displayName,
    count: tombstones.length,
    breadcrumbs,
  });

  const [tags, states, cities, years, relatedNews, config] = await Promise.all([
    getAllTombstoneTags(),
    getAllStates(),
    getAllCities(),
    getAllTransactionYears(),
    getRelatedNewsFromTombstones(tombstones),
    fetchSiteConfig(),
  ]);

  return (
    <TransactionsGroupingPage
      schema={schema}
      breadcrumbs={breadcrumbs}
      filter={{ type: 'city', value: city }}
      displayName={displayName}
      companyName={config.name}
      tombstones={tombstones}
      tags={tags}
      states={states}
      cities={cities}
      years={years}
      relatedNews={relatedNews}
      stateBackLink={
        stateCode
          ? {
              stateName,
              href: `/transactions/state/${stateCode.toLowerCase()}`,
            }
          : undefined
      }
    />
  );
}
