import { Metadata } from 'next';
import Link from 'next/link';
import { Container } from '@/components/ui/Container';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { Hero } from '@/components/sections/Hero';
import { getNewsArticles } from '@/lib/data';
import { siteConfig } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'News & Insights',
  description:
    'Latest news, transaction announcements, and insights from Flatirons Capital Advisors. Stay updated on M&A activity in the lower middle market.',
  alternates: {
    canonical: `${siteConfig.url}/news`,
  },
};

export default async function NewsPage() {
  const articles = await getNewsArticles();

  return (
    <>
      <Hero
        title="News & Insights"
        subtitle="Recent Transaction Announcements"
        description="Stay updated on our latest M&A transactions and industry insights."
        compact
      />

      <section className="py-16 md:py-24">
        <Container>
          <SectionHeading
            subtitle="Latest Updates"
            title="Recent Announcements"
          />

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {articles.map((article) => (
              <Link
                key={article.slug}
                href={`/news/${article.slug}`}
                className="group rounded-xl border border-border bg-white p-6 transition-all hover:shadow-card-hover"
              >
                <div className="mb-3">
                  <span className="text-sm text-secondary">{article.date}</span>
                </div>
                <h2 className="mb-3 text-lg font-semibold text-text group-hover:text-primary">
                  {article.title}
                </h2>
                <p className="text-sm text-text-muted line-clamp-3">
                  {article.excerpt}
                </p>
                <div className="mt-4">
                  <span className="inline-flex items-center gap-1 text-sm font-medium text-secondary group-hover:text-primary">
                    Read More
                    <svg
                      className="h-4 w-4 transition-transform group-hover:translate-x-1"
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
                  </span>
                </div>
              </Link>
            ))}
          </div>

          {articles.length === 0 && (
            <div className="py-12 text-center">
              <p className="text-text-muted">No news articles found.</p>
            </div>
          )}
        </Container>
      </section>
    </>
  );
}
