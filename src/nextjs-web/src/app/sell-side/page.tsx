import { Metadata } from 'next';
import { Container } from '@/components/ui/Container';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { Hero } from '@/components/sections/Hero';
import { CTASection } from '@/components/sections/CTASection';
import { Button } from '@/components/ui/Button';
import { siteConfig } from '@/lib/utils';
import { getPageData, getServicesByCategory } from '@/lib/data';

export const metadata: Metadata = {
  title: 'Sell-Side Advisory',
  description:
    'Sell-side M&A advisory services from Flatirons Capital Advisors. Private company exits, recapitalizations, divestitures, and generational transfers for business owners.',
  alternates: {
    canonical: `${siteConfig.url}/sell-side`,
  },
};

interface SellSideMetadata {
  subtitle?: string;
  description?: string;
  ctaTitle?: string;
  ctaDescription?: string;
  whyChooseUs?: string[];
}

export default async function SellSidePage() {
  const [pageContent, services, processSteps, benefits] = await Promise.all([
    getPageData('sell-side'),
    getServicesByCategory('sell-side', 'service'),
    getServicesByCategory('sell-side', 'process-step'),
    getServicesByCategory('sell-side', 'benefit'),
  ]);

  const meta = (pageContent?.metadata || {}) as SellSideMetadata;

  // Split content at --- to separate intro from approach text
  const contentSections = (pageContent?.content || '').split('---').map((s) => s.trim()).filter(Boolean);
  const introParagraphs = contentSections[0]?.split('\n\n').filter((p) => p.trim()) || [];
  const approachText = contentSections[1]?.split('\n\n').filter((p) => p.trim()) || [];

  const whyChooseUs = meta.whyChooseUs || [];

  return (
    <>
      <Hero
        title={pageContent?.title || 'Sell-Side M&A Advisory'}
        subtitle={meta.subtitle || 'Maximize Your Exit'}
        description={meta.description || "The focus of our sell-side advisory approach is on helping you make the right strategic moves to protect what you've built through years of hard work and sacrifice."}
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
          </div>
        </Container>
      </section>

      {/* Services */}
      {services.length > 0 && (
        <section className="bg-gradient-to-b from-surface to-surface-blue/30 py-16 md:py-24">
          <Container>
            <SectionHeading
              subtitle="What We Offer"
              title="Sell-Side Services"
              description="Comprehensive advisory services tailored to your specific situation and goals."
            />

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {services.map((service) => (
                <div
                  key={service.id}
                  className="rounded-xl border border-border bg-white p-6 shadow-sm transition-all hover:border-secondary/30 hover:shadow-lg hover:shadow-primary/10"
                >
                  <h3 className="mb-3 text-lg font-semibold text-primary">
                    {service.title}
                  </h3>
                  {service.description && (
                    <p className="text-text-muted">{service.description}</p>
                  )}
                </div>
              ))}
            </div>
          </Container>
        </section>
      )}

      {/* Our Process */}
      {processSteps.length > 0 && (
        <section className="py-16 md:py-24">
          <Container>
            <SectionHeading
              subtitle="How We Work"
              title="Our Proven Process"
              description="A structured approach that has delivered results for over 200 transactions."
            />

            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
              {processSteps
                .sort((a, b) => (a.step ?? a.sortOrder) - (b.step ?? b.sortOrder))
                .map((step, index) => (
                  <div key={step.id} className="relative">
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-light text-xl font-bold text-white">
                      {step.step ?? index + 1}
                    </div>
                    <h3 className="mb-2 text-lg font-semibold text-primary">
                      {step.title}
                    </h3>
                    {step.description && (
                      <p className="text-text-muted">{step.description}</p>
                    )}
                  </div>
                ))}
            </div>
          </Container>
        </section>
      )}

      {/* Why Choose Us */}
      {(whyChooseUs.length > 0 || approachText.length > 0) && (
        <section className="bg-gradient-to-b from-surface to-surface-blue/30 py-16 md:py-24">
          <Container>
            <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
              <div>
                <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-secondary">
                  The Flatirons Advantage
                </p>
                <h2 className="mb-6 text-3xl font-bold text-primary md:text-4xl">
                  Why Choose Flatirons?
                </h2>
                {approachText.map((p, i) => (
                  <p key={i} className={`text-lg text-text-muted${i > 0 ? ' mt-4' : ''}`}>
                    {p}
                  </p>
                ))}
              </div>

              {whyChooseUs.length > 0 && (
                <div className="rounded-xl border border-border bg-white p-8 shadow-sm">
                  <ul className="space-y-4">
                    {whyChooseUs.map((reason) => (
                      <li
                        key={reason}
                        className="flex items-start gap-3 text-text-muted"
                      >
                        <svg
                          className="mt-0.5 h-5 w-5 flex-shrink-0 text-secondary"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                        {reason}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
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
        title={meta.ctaTitle || 'Ready to explore your options?'}
        description={meta.ctaDescription || "Contact us for a confidential conversation about your business and goals. We'll help you understand what's possible."}
      />
    </>
  );
}
