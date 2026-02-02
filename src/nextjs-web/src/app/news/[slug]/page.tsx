import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Container } from '@/components/ui/Container';
import { CTASection } from '@/components/sections/CTASection';
import { ContentExplorer } from '@/components/sections/ContentExplorer';
import { 
  getNewsArticle, 
  getNewsArticles, 
  getRelatedTombstonesForNews,
  getRelatedNewsForNews,
  getAdjacentArticles,
  parseMarkdownContent,
  getAllNewsTags
} from '@/lib/data';
import { MarkdownContent } from '@/components/common/MarkdownContent';
import { siteConfig } from '@/lib/utils';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const articles = await getNewsArticles();
  return articles.map((article) => ({
    slug: article.slug,
  }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = await getNewsArticle(slug);

  if (!article) {
    return {
      title: 'Article Not Found',
    };
  }

  return {
    title: article.title,
    description: article.excerpt,
    alternates: {
      canonical: `${siteConfig.url}/news/${slug}`,
    },
    openGraph: {
      title: article.title,
      description: article.excerpt,
      type: 'article',
      publishedTime: article.date,
    },
  };
}

export default async function NewsArticlePage({ params }: PageProps) {
  const { slug } = await params;
  const article = await getNewsArticle(slug);

  if (!article) {
    notFound();
  }

  const contentBlocks = parseMarkdownContent(article.content);
  
  // Get related content
  const relatedTombstones = await getRelatedTombstonesForNews(article);
  const relatedNews = await getRelatedNewsForNews(article);
  const adjacentArticles = await getAdjacentArticles(slug);

  // Fetch all news tags for ContentExplorer
  const newsTags = await getAllNewsTags();

  return (
    <>
      {/* Breadcrumb */}
      <div className="border-b border-border bg-surface">
        <Container>
          <nav className="py-4">
            <ol className="flex items-center gap-2 text-sm text-text-muted">
              <li>
                <Link href="/" className="hover:text-primary">
                  Home
                </Link>
              </li>
              <li>/</li>
              <li>
                <Link href="/news" className="hover:text-primary">
                  News
                </Link>
              </li>
              <li>/</li>
              <li className="text-text">{article.title}</li>
            </ol>
          </nav>
        </Container>
      </div>

      {/* Article */}
      <article className="py-12 md:py-16">
        <Container>
          <div className="mx-auto max-w-3xl">
            {/* Header */}
            <header className="mb-8">
              <div className="mb-4 flex items-center gap-4">
                <span className="text-sm text-secondary">{article.date}</span>
                {article.author && (
                  <>
                    <span className="text-text-light">•</span>
                    <span className="text-sm text-text-muted">
                      {article.author}
                    </span>
                  </>
                )}
              </div>
              <h1 className="text-3xl font-bold text-text md:text-4xl">
                {article.title}
              </h1>
            </header>

            {/* Content */}
            <MarkdownContent blocks={contentBlocks} />

            {/* Related Transactions */}
            {relatedTombstones.length > 0 && (
              <div className="mt-12 border-t border-border pt-8">
                <h2 className="mb-6 text-xl font-bold text-text">
                  Related Transactions
                </h2>
                <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                  {relatedTombstones.map((tombstone) => (
                    <Link
                      key={tombstone.slug}
                      href={`/transactions/${tombstone.slug}`}
                      className="group rounded-lg border border-border bg-surface p-4 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:shadow-black/10"
                    >
                      <p className="font-semibold text-text group-hover:text-primary">
                        {tombstone.seller}
                      </p>
                      <p className="mt-1 text-sm text-text-muted">
                        {tombstone.industry}
                      </p>
                      <p className="mt-1 text-xs text-text-light">
                        {tombstone.transactionYear}
                      </p>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Related News Articles OR Prev/Next Navigation */}
            <div className="mt-12 border-t border-border pt-8">
              {relatedNews.length > 0 ? (
                <>
                  <h2 className="mb-6 text-xl font-bold text-text">
                    Related News
                  </h2>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {relatedNews.map((news) => (
                      <Link
                        key={news.slug}
                        href={`/news/${news.slug}`}
                        className="group rounded-lg border border-border bg-surface p-4 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:shadow-black/10"
                      >
                        <p className="text-sm text-secondary">{news.date}</p>
                        <p className="mt-1 font-semibold text-text group-hover:text-primary line-clamp-2">
                          {news.title}
                        </p>
                      </Link>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <h2 className="mb-6 text-xl font-bold text-text">
                    More News
                  </h2>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {/* Previous Article */}
                    <Link
                      href={`/news/${adjacentArticles.prev.slug}`}
                      className="group rounded-lg border border-border bg-surface p-4 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:shadow-black/10"
                    >
                      <div className="flex items-center gap-2 text-sm text-text-light">
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
                        Previous
                      </div>
                      <p className="mt-2 font-semibold text-text group-hover:text-primary line-clamp-2">
                        {adjacentArticles.prev.title}
                      </p>
                      <p className="mt-1 text-sm text-secondary">
                        {adjacentArticles.prev.date}
                      </p>
                    </Link>

                    {/* Next Article */}
                    <Link
                      href={`/news/${adjacentArticles.next.slug}`}
                      className="group rounded-lg border border-border bg-surface p-4 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:shadow-black/10"
                    >
                      <div className="flex items-center justify-end gap-2 text-sm text-text-light">
                        Next
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
                      </div>
                      <p className="mt-2 text-right font-semibold text-text group-hover:text-primary line-clamp-2">
                        {adjacentArticles.next.title}
                      </p>
                      <p className="mt-1 text-right text-sm text-secondary">
                        {adjacentArticles.next.date}
                      </p>
                    </Link>
                  </div>
                </>
              )}
            </div>

            {/* Explore More News */}
            <div className="mt-12 border-t border-border pt-8">
              <h2 className="mb-6 text-xl font-bold text-text">
                Explore More News
              </h2>
              <ContentExplorer type="news" tags={newsTags} />
            </div>

            {/* Back link */}
            <div className="mt-8">
              <Link
                href="/news"
                className="inline-flex items-center gap-2 text-secondary hover:text-primary"
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
                Back to News
              </Link>
            </div>
          </div>
        </Container>
      </article>

      <CTASection variant="light" />
    </>
  );
}
