import { Metadata } from 'next';
import Link from 'next/link';
import { Container } from '@/components/ui/Container';
import { ContactForm } from '@/components/forms/ContactForm';
import { getNewsArticles, getResourceArticles } from '@/lib/data';
import { siteConfig } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Contact',
  description:
    'Contact Flatirons Capital Advisors for M&A advisory services. Offices in Denver, Dallas, Miami, and Chicago. Call 303.319.4540.',
  alternates: {
    canonical: `${siteConfig.url}/contact`,
  },
};

export default async function ContactPage() {
  // Get a random news article
  const articles = await getNewsArticles();
  const randomArticle = articles[Math.floor(Math.random() * articles.length)];
  
  // Get a random resource
  const resources = await getResourceArticles();
  const randomResource = resources.length > 0 
    ? resources[Math.floor(Math.random() * resources.length)]
    : null;

  return (
    <section className="bg-gradient-to-b from-surface to-surface-blue/30 py-16 md:py-24">
      <Container>
        <div className="grid gap-12 lg:grid-cols-5 lg:gap-16">
          {/* Left: Form */}
          <div className="lg:col-span-3">
            <h1 className="mb-4 text-3xl font-bold text-primary md:text-4xl">
              We&apos;d love to hear from you!
            </h1>
            <p className="mb-10 text-lg text-text-muted">
              Let&apos;s explore how we can help you achieve your goals.
            </p>

            <ContactForm />
          </div>

          {/* Right: More Information */}
          <div className="lg:col-span-2">
            <h2 className="mb-6 text-xl font-semibold text-primary">
              More Information
            </h2>
            <div className="space-y-4">
              {/* Resources Link */}
              {randomResource && (
                <Link
                  href={`/resources/${randomResource.slug}`}
                  className="group block overflow-hidden rounded-xl border border-border bg-white p-6 shadow-sm transition-all hover:border-secondary/30 hover:shadow-lg hover:shadow-primary/10"
                >
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary/10 to-secondary/10">
                    <svg className="h-5 w-5 text-secondary" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                    </svg>
                  </div>
                  <h3 className="mb-2 text-lg font-semibold text-primary">
                    Resources
                  </h3>
                  <p className="mb-3 text-sm text-text-muted line-clamp-2">
                    {randomResource.title}
                  </p>
                  <span className="inline-flex items-center gap-1 text-sm font-medium text-secondary group-hover:text-primary">
                    Read More
                    <svg className="h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                    </svg>
                  </span>
                </Link>
              )}

              {/* News Article Link */}
              {randomArticle && (
                <Link
                  href={`/news/${randomArticle.slug}`}
                  className="group block overflow-hidden rounded-xl border border-border bg-white p-6 shadow-sm transition-all hover:border-secondary/30 hover:shadow-lg hover:shadow-primary/10"
                >
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary/10 to-secondary/10">
                    <svg className="h-5 w-5 text-secondary" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V18a2.25 2.25 0 002.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5M6 7.5h3v3H6v-3z" />
                    </svg>
                  </div>
                  <h3 className="mb-2 text-lg font-semibold text-primary">
                    Latest News
                  </h3>
                  <p className="mb-3 text-sm text-text-muted line-clamp-2">
                    {randomArticle.title}
                  </p>
                  <span className="inline-flex items-center gap-1 text-sm font-medium text-secondary group-hover:text-primary">
                    Read More
                    <svg className="h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                    </svg>
                  </span>
                </Link>
              )}

              {/* Transactions Link */}
              <Link
                href="/transactions"
                className="group block overflow-hidden rounded-xl border border-border bg-white p-6 shadow-sm transition-all hover:border-secondary/30 hover:shadow-lg hover:shadow-primary/10"
              >
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary/10 to-secondary/10">
                  <svg className="h-5 w-5 text-secondary" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                  </svg>
                </div>
                <h3 className="mb-2 text-lg font-semibold text-primary">
                  Our Track Record
                </h3>
                <p className="mb-3 text-sm text-text-muted">
                  View our completed transactions across industries.
                </p>
                <span className="inline-flex items-center gap-1 text-sm font-medium text-secondary group-hover:text-primary">
                  See Transactions
                  <svg className="h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </span>
              </Link>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
