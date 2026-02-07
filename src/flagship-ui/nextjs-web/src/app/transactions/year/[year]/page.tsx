import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import {
  getAllTransactionYears,
  getTombstonesByYear,
  getAllTombstoneTags,
  getAllStates,
  getAllCities,
  getNewsArticlesByTag,
} from '@/lib/data';
import type { NewsArticle } from '@/lib/types';
import { fetchSiteConfig } from '@/lib/utils';
import { generateGroupingMetadata, generateGroupingPageSchema } from '@/lib/seo';
import { TransactionsGroupingPage } from '@/components/transactions/TransactionsGroupingPage';

interface PageProps {
  params: Promise<{ year: string }>;
}

export async function generateStaticParams() {
  const years = await getAllTransactionYears();
  return years.map((year) => ({ year: year.toString() }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { year } = await params;
  const yearNum = parseInt(year, 10);
  const tombstones = await getTombstonesByYear(yearNum);

  if (tombstones.length === 0) {
    return { title: 'Year Not Found' };
  }

  return generateGroupingMetadata('year', year, tombstones.length);
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

  const [tags, states, cities, allYears, relatedNews, config] = await Promise.all([
    getAllTombstoneTags(),
    getAllStates(),
    getAllCities(),
    getAllTransactionYears(),
    getRelatedNewsFromTombstones(tombstones),
    fetchSiteConfig(),
  ]);

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
      tags={tags}
      states={states}
      cities={cities}
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
