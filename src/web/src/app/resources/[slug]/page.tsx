import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Container } from '@/components/ui/Container';
import { CTASection } from '@/components/sections/CTASection';
import { getResourceArticle, getResourceArticles, parseMarkdownContent } from '@/lib/data';
import { siteConfig } from '@/lib/utils';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const articles = await getResourceArticles();
  return articles.map((article) => ({
    slug: article.slug,
  }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = await getResourceArticle(slug);

  if (!article) {
    return {
      title: 'Article Not Found',
    };
  }

  return {
    title: article.title,
    description: article.excerpt,
    alternates: {
      canonical: `${siteConfig.url}/resources/${slug}`,
    },
    openGraph: {
      title: article.title,
      description: article.excerpt,
      type: 'article',
    },
  };
}

export default async function ResourceArticlePage({ params }: PageProps) {
  const { slug } = await params;
  const article = await getResourceArticle(slug);

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
                <Link href="/resources" className="hover:text-primary">
                  Resources
                </Link>
              </li>
              <li>/</li>
              <li className="text-text line-clamp-1">{article.title}</li>
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
                <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                  {article.category}
                </span>
                <span className="text-sm text-text-muted">
                  By {article.author}
                </span>
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
                // Check if it's a list
                if (block.startsWith('- ')) {
                  const items = block.split('\n').filter((line) => line.startsWith('- '));
                  return (
                    <ul key={index} className="mb-4 list-disc space-y-2 pl-6 text-text-muted">
                      {items.map((item, i) => (
                        <li key={i}>{item.replace('- ', '')}</li>
                      ))}
                    </ul>
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

            {/* About section */}
            <div className="mt-12 rounded-lg border border-border bg-surface p-6">
              <h3 className="mb-2 font-semibold text-text">
                About Flatirons Capital Advisors
              </h3>
              <p className="text-sm text-text-muted">
                Flatirons Capital Advisors, LLC is an investment banking firm that
                helps privately held companies sell their businesses, acquire other
                businesses, and raise capital. Our unique business model affords
                sell-side advisory clients the ability to improve their company&apos;s
                performance while simultaneously increasing their market value for
                a future sale.
              </p>
            </div>

            {/* Back link */}
            <div className="mt-8 border-t border-border pt-8">
              <Link
                href="/resources"
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
                Back to Resources
              </Link>
            </div>
          </div>
        </Container>
      </article>

      <CTASection variant="light" />
    </>
  );
}
