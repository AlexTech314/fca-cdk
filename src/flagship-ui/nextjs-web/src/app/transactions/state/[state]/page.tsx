import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import {
  getTombstoneFilterOptions,
  getTombstonesByState,
  cityToSlug,
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
  params: Promise<{ state: string }>;
}

export async function generateStaticParams() {
  const filters = await getTombstoneFilterOptions();
  return filters.states.map((s) => ({ state: s.id.toLowerCase() }));
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
    ...new Set(tombstones.flatMap((t) =>
      t.locationCities.map((c) => c.name)
    )),
  ].sort();

  const [filters, relatedNews, config] = await Promise.all([
    getTombstoneFilterOptions(),
    getRelatedNewsFromTombstones(tombstones),
    fetchSiteConfig(),
  ]);

  return (
    <TransactionsGroupingPage
      schema={schema}
      breadcrumbs={breadcrumbs}
      filter={{ type: 'state', value: state.toUpperCase() }}
      displayName={stateName}
      companyName={config.name}
      tombstones={tombstones}
      industries={filters.industries}
      states={filters.states}
      cities={filters.cities}
      years={filters.years}
      relatedNews={relatedNews}
      cityFilter={{
        cities: citiesInState,
        cityToHref: (city) => `/transactions/city/${cityToSlug(city)}`,
      }}
    />
  );
}
