export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import { Container } from '@/components/ui/Container';
import { Hero } from '@/components/sections/Hero';
import { CTASection } from '@/components/sections/CTASection';
import { fetchSiteConfig, pageMetadata } from '@/lib/utils';
import { getPageData } from '@/lib/data';

interface BuySideMetadata {
  metaDescription?: string;
  subtitle?: string;
  description?: string;
  searchHeading?: string;
  servicesLabel?: string;
  serviceBullets?: string;
  ctaTitle?: string;
  ctaDescription?: string;
  ctaText?: string;
}

export async function generateMetadata(): Promise<Metadata> {
  const [config, pageContent] = await Promise.all([
    fetchSiteConfig(),
    getPageData('buy-side'),
  ]);
  const meta = (pageContent?.metadata || {}) as BuySideMetadata;
  return pageMetadata(config, {
    title: 'Buy-Side Advisory',
    description: meta.metaDescription || 'Buy-side acquisition search advisory services from Flatirons Capital Advisors. Advising PE sponsors, family offices, and strategic acquirers on targeted investment opportunities.',
    canonical: `${config.url}/buy-side`,
  });
}

export default async function BuySidePage() {
  const pageContent = await getPageData('buy-side');

  const meta = (pageContent?.metadata || {}) as BuySideMetadata;

  // Split content at --- to separate intro from acquisition search detail
  const contentSections = (pageContent?.content || '').split('---').map((s) => s.trim()).filter(Boolean);
  const introParagraphs = contentSections[0]?.split('\n\n').filter((p) => p.trim()) || [];
  const searchDetailParagraphs = contentSections[1]?.split('\n\n').filter((p) => p.trim()) || [];

  const serviceBullets = typeof meta.serviceBullets === 'string'
    ? meta.serviceBullets.split('\n').filter((s) => s.trim())
    : [];

  return (
    <>
      <Hero
        title={pageContent?.title || 'Buy-Side Acquisition Search Advisory'}
        subtitle={meta.subtitle}
        description={meta.description}
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

      {/* Acquisition Search */}
      {(searchDetailParagraphs.length > 0 || serviceBullets.length > 0) && (
        <section className="bg-surface py-16 md:py-24">
          <Container>
            <div className="mx-auto max-w-3xl">
              <h2 className="mb-6 text-2xl font-bold text-text md:text-3xl">
                {meta.searchHeading || 'Acquisition Search'}
              </h2>
              {searchDetailParagraphs.map((p, i) => (
                <p key={i} className={`text-lg text-text-muted leading-relaxed${i > 0 ? ' mt-4' : ''}`}>
                  {p}
                </p>
              ))}
              {serviceBullets.length > 0 && (
                <div className="mt-8">
                  <p className="mb-4 font-semibold text-text">
                    {meta.servicesLabel || 'Our services include:'}
                  </p>
                  <ul className="space-y-3 text-text-muted">
                    {serviceBullets.map((bullet, i) => (
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
      )}

      <CTASection
        title={meta.ctaTitle || 'Ready to explore acquisition opportunities?'}
        description={meta.ctaDescription || 'Contact us to discuss how our buy-side advisory services can support your acquisition strategy.'}
        ctaText={meta.ctaText}
      />
    </>
  );
}
