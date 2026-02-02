import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Container } from '@/components/ui/Container';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { TombstoneGrid } from '@/components/sections/TombstoneGrid';
import { ContentExplorer } from '@/components/sections/ContentExplorer';
import { 
  getAllStates, 
  getTombstonesByState, 
  cityToSlug,
  getAllTombstoneTags,
  getAllCities,
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

  return generateGroupingMetadata('state', state.toUpperCase(), tombstones.length);
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

  const schema = generateGroupingPageSchema({
    type: 'state',
    value: state.toUpperCase(),
    displayName: stateName,
    count: tombstones.length,
    breadcrumbs,
  });

  // Get unique cities within this state for internal linking
  const citiesInState = [...new Set(tombstones.map((t) => t.city).filter(Boolean))].sort();

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
              Transactions by State
            </p>
            <h1 className="text-3xl font-bold text-text md:text-4xl">
              {stateName} M&A Transactions
            </h1>
            <p className="mt-4 text-lg text-text-muted">
              Explore {tombstones.length} completed M&A transaction{tombstones.length !== 1 ? 's' : ''} in {stateName}.
            </p>
          </header>

          {citiesInState.length > 1 && (
            <div className="mb-8">
              <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-text-muted">
                Filter by City
              </h2>
              <div className="flex flex-wrap gap-2">
                {citiesInState.map((city) => (
                  <Link
                    key={city}
                    href={`/transactions/city/${cityToSlug(city)}`}
                    className="rounded-full border border-border bg-white px-4 py-1.5 text-sm text-text hover:border-primary hover:text-primary transition-colors"
                  >
                    {city}
                  </Link>
                ))}
              </div>
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
