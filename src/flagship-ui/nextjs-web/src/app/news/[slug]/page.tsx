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
  getAllNewsTags,
  getTagNamesMap,
  getPageData,
} from '@/lib/data';
import { MarkdownContent } from '@/components/common/MarkdownContent';
import { TombstoneGrid } from '@/components/sections/TombstoneGrid';
import { RelatedNewsSection } from '@/components/sections/RelatedNewsSection';
import { fetchSiteConfig } from '@/lib/utils';

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
  const [article, config] = await Promise.all([
    getNewsArticle(slug),
    fetchSiteConfig(),
  ]);

  if (!article) {
    return {
      title: 'Article Not Found',
    };
  }

  return {
    title: article.title,
    description: article.excerpt,
    alternates: {
      canonical: `${config.url}/news/${slug}`,
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

  // Fetch all news tags for ContentExplorer + news page CTA metadata
  const [newsTags, tagNames, newsPage] = await Promise.all([getAllNewsTags(), getTagNamesMap(), getPageData('news')]);
  const newsMeta = (newsPage?.metadata || {}) as { ctaTitle?: string; ctaDescription?: string; ctaText?: string };

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
            {/* Header meta */}
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

            {/* Content (title is the first H1 in the markdown) */}
            <MarkdownContent blocks={contentBlocks} />

            {/* Related Transactions (same tombstone cards as elsewhere, with images) */}
            {relatedTombstones.length > 0 && (
              <div className="mt-12 border-t border-border pt-8">
                <h2 className="mb-6 text-xl font-bold text-text">
                  Related Transactions
                </h2>
                <TombstoneGrid tombstones={relatedTombstones} />
              </div>
            )}

            {/* Related News (preview + Read More like other pages) or Prev/Next */}
            <div className="mt-12">
              {relatedNews.length > 0 ? (
                <RelatedNewsSection
                  title="Related News"
                  articles={relatedNews}
                  viewAllHref="/news"
                  viewAllText="View all news →"
                  maxItems={6}
                  columns={3}
                />
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
              <ContentExplorer type="news" tags={newsTags} tagNames={tagNames} />
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

      <CTASection
        variant="light"
        title={newsMeta.ctaTitle}
        description={newsMeta.ctaDescription}
        ctaText={newsMeta.ctaText}
      />
    </>
  );
}
