import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import {
  getTombstoneFilterOptions,
  getTombstonesByCity,
  cityToSlug,
  slugToCity,
  getRelatedNewsFromTombstones,
} from '@/lib/data';
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
  const filters = await getTombstoneFilterOptions();
  return filters.cities.map((city) => ({ city: cityToSlug(city) }));
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

  const [filters, relatedNews, config] = await Promise.all([
    getTombstoneFilterOptions(),
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
      tags={filters.tags.map((t) => t.slug)}
      states={filters.states}
      cities={filters.cities}
      years={filters.years}
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
