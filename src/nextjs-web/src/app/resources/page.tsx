import { Metadata } from 'next';
import Link from 'next/link';
import { Container } from '@/components/ui/Container';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { Hero } from '@/components/sections/Hero';
import { CTASection } from '@/components/sections/CTASection';
import { getResourceArticles } from '@/lib/data';
import { siteConfig } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Resources',
  description:
    'M&A resources and guides for business owners. Learn about selling your business, recapitalizations, exit planning, and more.',
  alternates: {
    canonical: `${siteConfig.url}/resources`,
  },
};

export default async function ResourcesPage() {
  const articles = await getResourceArticles();

  return (
    <>
      <Hero
        title="Resources"
        subtitle="M&A Guides & Articles"
        description="Featured articles and guides for business owners considering M&A transactions."
        compact
      />

      <section className="py-16 md:py-24">
        <Container>
          <SectionHeading
            subtitle="Expert Insights"
            title="Articles for Business Owners"
          />

          <div className="grid gap-6 md:grid-cols-2">
            {articles.map((article) => (
              <Link
                key={article.slug}
                href={`/resources/${article.slug}`}
                className="group rounded-xl border border-border bg-white p-6 transition-all hover:shadow-card-hover md:p-8"
              >
                <div className="mb-3 flex items-center gap-3">
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                    {article.category}
                  </span>
                  <span className="text-sm text-text-muted">
                    By {article.author}
                  </span>
                </div>
                <h2 className="mb-3 text-xl font-semibold text-text group-hover:text-primary">
                  {article.title}
                </h2>
                <p className="text-text-muted line-clamp-3">{article.excerpt}</p>
                <div className="mt-4">
                  <span className="inline-flex items-center gap-1 text-sm font-medium text-secondary group-hover:text-primary">
                    Read Article
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
              <p className="text-text-muted">No resource articles found.</p>
            </div>
          )}
        </Container>
      </section>

      <CTASection
        title="Have questions about selling your business?"
        description="Our team is here to help guide you through the process."
      />
    </>
  );
}
