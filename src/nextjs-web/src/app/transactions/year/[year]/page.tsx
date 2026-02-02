import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Container } from '@/components/ui/Container';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { TombstoneGrid } from '@/components/sections/TombstoneGrid';
import { ContentExplorer } from '@/components/sections/ContentExplorer';
import { 
  getAllTransactionYears, 
  getTombstonesByYear,
  getAllTombstoneTags,
  getAllStates,
  getAllCities,
  getNewsArticlesByTag
} from '@/lib/data';
import type { NewsArticle } from '@/lib/types';
import { 
  generateGroupingMetadata, 
  generateGroupingPageSchema 
} from '@/lib/seo';

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

  const schema = generateGroupingPageSchema({
    type: 'year',
    value: year,
    displayName: `${year} Transactions`,
    count: tombstones.length,
    breadcrumbs,
  });

  // Get all years for navigation and ContentExplorer data
  const [tags, states, cities, allYears] = await Promise.all([
    getAllTombstoneTags(),
    getAllStates(),
    getAllCities(),
    getAllTransactionYears(),
  ]);

  // Get unique tags from transactions on this page for related news
  const uniqueTags = [...new Set(tombstones.flatMap((t) => t.tags || []))];
  
  // Fetch related news for these tags
  const newsPromises = uniqueTags.map((tag) => getNewsArticlesByTag(tag));
  const newsResults = await Promise.all(newsPromises);
  
  // Combine and deduplicate news articles
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
  // Sort by date (newest first) and limit
  relatedNews.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const currentIndex = allYears.indexOf(yearNum);
  const prevYear = currentIndex < allYears.length - 1 ? allYears[currentIndex + 1] : null;
  const nextYear = currentIndex > 0 ? allYears[currentIndex - 1] : null;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: schema }}
      />

      <section className="py-16 md:py-24">
        <Container>
          <Breadcrumb items={breadcrumbs} />

          <header className="mb-12">
            <p className="mb-2 text-sm font-medium uppercase tracking-wider text-secondary">
              Transactions by Year
            </p>
            <h1 className="text-3xl font-bold text-text md:text-4xl">
              {year} Completed Transactions
            </h1>
            <p className="mt-4 text-lg text-text-muted">
              Review {tombstones.length} M&A transaction{tombstones.length !== 1 ? 's' : ''} completed in {year}.
            </p>
          </header>

          {/* Year Navigation */}
          <div className="mb-8 flex flex-wrap gap-2">
            <span className="mr-2 text-sm font-medium text-text-muted">Browse by year:</span>
            {allYears.map((y) => (
              <Link
                key={y}
                href={`/transactions/year/${y}`}
                className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                  y === yearNum
                    ? 'border-primary bg-primary !text-white'
                    : 'border-border bg-white text-text hover:border-primary hover:text-primary'
                }`}
              >
                {y}
              </Link>
            ))}
          </div>

          <TombstoneGrid tombstones={tombstones} />

          {/* Related News */}
          {relatedNews.length > 0 && (
            <div className="mt-16 border-t border-border pt-12">
              <h2 className="mb-6 text-xl font-bold text-text">
                Related News
              </h2>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {relatedNews.slice(0, 3).map((article) => (
                  <Link
                    key={article.slug}
                    href={`/news/${article.slug}`}
                    className="group rounded-xl border border-border bg-white p-6 transition-all hover:shadow-card-hover"
                  >
                    <div className="mb-3">
                      <span className="text-sm text-secondary">{article.date}</span>
                    </div>
                    <h3 className="mb-3 text-lg font-semibold text-text group-hover:text-primary">
                      {article.title}
                    </h3>
                    <p className="text-sm text-text-muted line-clamp-3">
                      {article.excerpt}
                    </p>
                  </Link>
                ))}
              </div>
              {relatedNews.length > 3 && (
                <div className="mt-6 text-center">
                  <Link
                    href="/news"
                    className="inline-flex items-center gap-1 text-sm font-medium text-secondary hover:text-primary"
                  >
                    View all news →
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* Prev/Next Navigation */}
          <div className="mt-12 flex justify-between">
            {prevYear ? (
              <Link
                href={`/transactions/year/${prevYear}`}
                className="inline-flex items-center gap-2 text-secondary hover:text-primary transition-colors"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="2"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
                  />
                </svg>
                {prevYear} Transactions
              </Link>
            ) : (
              <div />
            )}
            {nextYear ? (
              <Link
                href={`/transactions/year/${nextYear}`}
                className="inline-flex items-center gap-2 text-secondary hover:text-primary transition-colors"
              >
                {nextYear} Transactions
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="2"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                  />
                </svg>
              </Link>
            ) : (
              <div />
            )}
          </div>

          <div className="mt-12">
            <ContentExplorer
              type="transactions"
              tags={tags}
              states={states}
              cities={cities}
              years={allYears}
            />
          </div>
        </Container>
      </section>
    </>
  );
}
