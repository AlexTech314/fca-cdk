import { Metadata } from 'next';
import { Container } from '@/components/ui/Container';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { Hero } from '@/components/sections/Hero';
import { CTASection } from '@/components/sections/CTASection';
import { Button } from '@/components/ui/Button';
import { siteConfig } from '@/lib/utils';
import { getPageData, getServicesByCategory } from '@/lib/data';

export const metadata: Metadata = {
  title: 'Buy-Side Advisory',
  description:
    'Buy-side M&A advisory services from Flatirons Capital Advisors. Acquisition search, sponsor services, and buy-side representation for strategic buyers.',
  alternates: {
    canonical: `${siteConfig.url}/buy-side`,
  },
};

interface BuySideMetadata {
  subtitle?: string;
  description?: string;
  processBullets?: string[];
  ctaTitle?: string;
  ctaDescription?: string;
}

export default async function BuySidePage() {
  const [pageContent, benefits, disadvantages] = await Promise.all([
    getPageData('buy-side'),
    getServicesByCategory('buy-side', 'benefit'),
    getServicesByCategory('buy-side', 'disadvantage'),
  ]);

  const meta = (pageContent?.metadata || {}) as BuySideMetadata;

  // Split content at --- to separate intro from approach text
  const contentSections = (pageContent?.content || '').split('---').map((s) => s.trim()).filter(Boolean);
  const introParagraphs = contentSections[0]?.split('\n\n').filter((p) => p.trim()) || [];
  const approachParagraphs = contentSections[1]?.split('\n\n').filter((p) => p.trim()) || [];

  const processBullets = meta.processBullets || [];

  return (
    <>
      <Hero
        title={pageContent?.title || 'Buy-Side M&A Advisory'}
        subtitle={meta.subtitle || 'A Free Look'}
        description={meta.description || "Finding the simplest, shortest and most efficient solutions for our clients' desired outcomes."}
        compact
      />

      {/* Introduction */}
      <section className="py-16 md:py-24">
        <Container>
          <div className="mx-auto max-w-3xl">
            {introParagraphs.map((p, i) => (
              <p key={i} className={`text-lg text-text-muted leading-relaxed${i > 0 ? ' mt-4' : ''}`}>
                {p}
              </p>
            ))}
            {processBullets.length > 0 && (
              <div className="mt-8 rounded-lg bg-surface p-6">
                <h3 className="mb-4 font-semibold text-text">
                  Understanding the Process
                </h3>
                <ul className="space-y-3 text-text-muted">
                  {processBullets.map((bullet, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-secondary" />
                      {bullet}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </Container>
      </section>

      {/* Benefits & Disadvantages */}
      {(benefits.length > 0 || disadvantages.length > 0) && (
        <section className="bg-surface py-16 md:py-24">
          <Container>
            <div className="grid gap-8 lg:grid-cols-2">
              {/* Benefits */}
              {benefits.length > 0 && (
                <div className="rounded-xl border border-border bg-white p-8">
                  <h2 className="mb-6 text-xl font-bold text-text">
                    Potential Benefits to the Business Owner
                  </h2>
                  <ul className="space-y-4">
                    {benefits.map((benefit) => (
                      <li
                        key={benefit.id}
                        className="flex items-start gap-3 text-text-muted"
                      >
                        <svg
                          className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-500"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                        {benefit.title}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Disadvantages */}
              {disadvantages.length > 0 && (
                <div className="rounded-xl border border-border bg-white p-8">
                  <h2 className="mb-6 text-xl font-bold text-text">
                    Key Disadvantages to the Business Owner
                  </h2>
                  <ul className="space-y-4">
                    {disadvantages.map((disadvantage) => (
                      <li
                        key={disadvantage.id}
                        className="flex items-start gap-3 text-text-muted"
                      >
                        <svg
                          className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-500"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                            clipRule="evenodd"
                          />
                        </svg>
                        {disadvantage.title}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </Container>
        </section>
      )}

      {/* Our Approach */}
      {approachParagraphs.length > 0 && (
        <section className="py-16 md:py-24">
          <Container>
            <SectionHeading subtitle="How We Work" title="Our Approach" />

            <div className="mx-auto max-w-3xl space-y-6 text-text-muted leading-relaxed">
              {approachParagraphs.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>

            <div className="mt-12 text-center">
              <Button href="/transactions" variant="outline">
                View Our Transaction History
              </Button>
            </div>
          </Container>
        </section>
      )}

      <CTASection
        title={meta.ctaTitle || 'Interested in a buy-side approach?'}
        description={meta.ctaDescription || 'Contact us to discuss whether a buy-side engagement might be the right fit for your situation.'}
      />
    </>
  );
}
