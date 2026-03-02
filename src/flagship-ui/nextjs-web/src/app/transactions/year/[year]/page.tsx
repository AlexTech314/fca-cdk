import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import {
  getTombstoneFilterOptions,
  getTombstonesByYear,
  getRelatedNewsFromTombstones,
} from '@/lib/data';
import { fetchSiteConfig } from '@/lib/utils';
import { generateGroupingMetadata, generateGroupingPageSchema } from '@/lib/seo';
import { TransactionsGroupingPage } from '@/components/transactions/TransactionsGroupingPage';

interface PageProps {
  params: Promise<{ year: string }>;
}

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { year } = await params;
  const yearNum = parseInt(year, 10);
  const tombstones = await getTombstonesByYear(yearNum);

  if (tombstones.length === 0) {
    return { title: 'Year Not Found' };
  }

  return generateGroupingMetadata('year', year, tombstones.length);
}

export default async function TransactionsByYearPage({ params }: PageProps) {
  const { year } = await params;
  const yearNum = parseInt(year, 10);
  const tombstones = await getTombstonesByYear(yearNum);

  if (tombstones.length === 0 || isNaN(yearNum)) {
    notFound();
  }

  const breadcrumbs = [
    { name: 'Home', url: '/' },
    { name: 'Transactions', url: '/transactions' },
    { name: year },
  ];

  const schema = await generateGroupingPageSchema({
    type: 'year',
    value: year,
    displayName: `${year} Transactions`,
    count: tombstones.length,
    breadcrumbs,
  });

  const [filters, relatedNews, config] = await Promise.all([
    getTombstoneFilterOptions(),
    getRelatedNewsFromTombstones(tombstones),
    fetchSiteConfig(),
  ]);

  const allYears = filters.years;
  const currentIndex = allYears.indexOf(yearNum);
  const prevYear =
    currentIndex < allYears.length - 1 ? allYears[currentIndex + 1] : null;
  const nextYear = currentIndex > 0 ? allYears[currentIndex - 1] : null;

  return (
    <TransactionsGroupingPage
      schema={schema}
      breadcrumbs={breadcrumbs}
      filter={{ type: 'year', value: year }}
      displayName={`${year} Transactions`}
      companyName={config.name}
      tombstones={tombstones}
      industries={filters.industries}
      states={filters.states}
      cities={filters.cities}
      years={allYears}
      relatedNews={relatedNews}
      yearNav={{
        allYears,
        prevYear,
        nextYear,
        currentYear: yearNum,
      }}
    />
  );
}
