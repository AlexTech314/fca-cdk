import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Container } from '@/components/ui/Container';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { TombstoneGrid } from '@/components/sections/TombstoneGrid';
import { ContentExplorer } from '@/components/sections/ContentExplorer';
import { 
  getAllCities, 
  getTombstonesByCity, 
  cityToSlug, 
  slugToCity,
  getAllTombstoneTags,
  getAllStates,
  getAllTransactionYears,
  getNewsArticlesByTag
} from '@/lib/data';
import type { NewsArticle } from '@/lib/types';
import { 
  getStateName, 
  generateGroupingMetadata, 
  generateGroupingPageSchema 
} from '@/lib/seo';

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

  // Get state from first tombstone for context
  const stateCode = tombstones[0]?.state || undefined;

  return generateGroupingMetadata('city', city, tombstones.length, { state: stateCode });
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
    ...(stateCode ? [{ name: stateName, url: `/transactions/state/${stateCode.toLowerCase()}` }] : []),
    { name: cityName },
  ];

  const schema = generateGroupingPageSchema({
    type: 'city',
    value: city,
    displayName,
    count: tombstones.length,
    breadcrumbs,
  });

  // Fetch data for ContentExplorer
  const [tags, states, cities, years] = await Promise.all([
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
  // Sort by date (newest first)
  relatedNews.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

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
              Transactions by City
            </p>
            <h1 className="text-3xl font-bold text-text md:text-4xl">
              {displayName} M&A Transactions
            </h1>
            <p className="mt-4 text-lg text-text-muted">
              View {tombstones.length} completed M&A transaction{tombstones.length !== 1 ? 's' : ''} in {displayName}.
            </p>
          </header>

          {stateCode && (
            <div className="mb-8">
              <Link
                href={`/transactions/state/${stateCode.toLowerCase()}`}
                className="inline-flex items-center gap-2 text-sm text-secondary hover:text-primary transition-colors"
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
                View all {stateName} transactions
              </Link>
            </div>
          )}

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

          <div className="mt-12">
            <ContentExplorer
              type="transactions"
              tags={tags}
              states={states}
              cities={cities}
              years={years}
              defaultExpanded
            />
          </div>
        </Container>
      </section>
    </>
  );
}
