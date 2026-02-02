import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Container } from '@/components/ui/Container';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { TombstoneGrid } from '@/components/sections/TombstoneGrid';
import { ContentExplorer } from '@/components/sections/ContentExplorer';
import { 
  getAllTombstoneTags, 
  getTombstonesByTag,
  getAllStates,
  getAllCities,
  getAllTransactionYears,
  getNewsArticlesByTag
} from '@/lib/data';
import { 
  formatTagName, 
  generateGroupingMetadata, 
  generateGroupingPageSchema 
} from '@/lib/seo';

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

  const schema = generateGroupingPageSchema({
    type: 'tag',
    value: tag,
    displayName,
    count: tombstones.length,
    breadcrumbs,
  });

  // Fetch data for ContentExplorer and related news
  const [tags, states, cities, years, relatedNews] = await Promise.all([
    getAllTombstoneTags(),
    getAllStates(),
    getAllCities(),
    getAllTransactionYears(),
    getNewsArticlesByTag(tag),
  ]);

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
              Transactions by Industry
            </p>
            <h1 className="text-3xl font-bold text-text md:text-4xl">
              {displayName} M&A Transactions
            </h1>
            <p className="mt-4 text-lg text-text-muted">
              Browse {tombstones.length} completed {displayName.toLowerCase()} transaction{tombstones.length !== 1 ? 's' : ''} from Flatirons Capital Advisors.
            </p>
          </header>

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
                    href={`/news/tag/${tag}`}
                    className="inline-flex items-center gap-1 text-sm font-medium text-secondary hover:text-primary"
                  >
                    View all {relatedNews.length} related articles →
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
