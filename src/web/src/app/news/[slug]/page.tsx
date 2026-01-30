import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Container } from '@/components/ui/Container';
import { CTASection } from '@/components/sections/CTASection';
import { getNewsArticle, getNewsArticles, parseMarkdownContent } from '@/lib/data';
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
            <div className="prose prose-lg max-w-none">
              {contentBlocks.map((block, index) => {
                // Check if it's a heading
                if (block.startsWith('## ')) {
                  return (
                    <h2 key={index} className="mt-8 mb-4 text-xl font-bold text-text">
                      {block.replace('## ', '')}
                    </h2>
                  );
                }
                if (block.startsWith('### ')) {
                  return (
                    <h3 key={index} className="mt-6 mb-3 text-lg font-semibold text-text">
                      {block.replace('### ', '')}
                    </h3>
                  );
                }
                // Regular paragraph
                return (
                  <p key={index} className="mb-4 text-text-muted leading-relaxed">
                    {block}
                  </p>
                );
              })}
            </div>

            {/* Back link */}
            <div className="mt-12 border-t border-border pt-8">
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
