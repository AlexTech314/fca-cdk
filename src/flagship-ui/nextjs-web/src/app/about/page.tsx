import type { Metadata } from 'next';
import Image from 'next/image';
import { Container } from '@/components/ui/Container';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { Hero } from '@/components/sections/Hero';
import { ServicesGrid } from '@/components/sections/ServicesGrid';
import { CTASection } from '@/components/sections/CTASection';
import { fetchSiteConfig } from '@/lib/utils';
import {
  getPageData,
  getServicesByCategory,
  getAllIndustrySectors,
  getAllCoreValues,
} from '@/lib/data';

interface AboutMetadata {
  metaDescription?: string;
  heroDescription?: string;
  companyHeading?: string;
  servicesSubtitle?: string;
  servicesTitle?: string;
  servicesDescription?: string;
  buySideHeading?: string;
  sellSideHeading?: string;
  strategicHeading?: string;
  targetSubtitle?: string;
  targetTitle?: string;
  financialCriteriaHeading?: string;
  financialCriteria?: string;
  otherCriteriaHeading?: string;
  otherCriteria?: string;
  industrySectorsHeading?: string;
  valuesSubtitle?: string;
  valuesTitle?: string;
  ctaTitle?: string;
  ctaDescription?: string;
  ctaText?: string;
}

export async function generateMetadata(): Promise<Metadata> {
  const [config, pageContent] = await Promise.all([
    fetchSiteConfig(),
    getPageData('about'),
  ]);
  const meta = (pageContent?.metadata || {}) as AboutMetadata;
  return {
    title: 'About',
    description: meta.metaDescription || config.description,
    alternates: { canonical: `${config.url}/about` },
  };
}

export default async function AboutPage() {
  const [
    pageContent,
    sellSideServices,
    buySideServices,
    strategicServices,
    industrySectors,
    coreValues,
  ] = await Promise.all([
    getPageData('about'),
    getServicesByCategory('sell-side', 'service'),
    getServicesByCategory('buy-side', 'service'),
    getServicesByCategory('strategic', 'service'),
    getAllIndustrySectors(),
    getAllCoreValues(),
  ]);

  const meta = (pageContent?.metadata || {}) as AboutMetadata;
  const contentParagraphs = pageContent?.content
    ? pageContent.content.split('\n\n').filter((p) => p.trim())
    : [];

  // Criteria are stored as newline-separated strings
  const financialCriteria = typeof meta.financialCriteria === 'string'
    ? meta.financialCriteria.split('\n').filter((s) => s.trim())
    : [];
  const otherCriteria = typeof meta.otherCriteria === 'string'
    ? meta.otherCriteria.split('\n').filter((s) => s.trim())
    : [];

  return (
    <>
      <Hero
        title={pageContent?.title || ''}
        description={meta.heroDescription}
        compact
      />

      {/* Company Overview */}
      <section className="py-16 md:py-24">
        <Container>
          <div className="mx-auto max-w-3xl">
            <h2 className="mb-6 text-3xl font-bold text-primary">
              {meta.companyHeading || pageContent?.title || ''}
            </h2>
            <div className="space-y-4 text-lg text-text-muted">
              {contentParagraphs.map((p, i) => <p key={i}>{p}</p>)}
            </div>
          </div>
        </Container>
      </section>

      {/* M&A Services -- reuses shared ServicesGrid component */}
      <ServicesGrid
        buySideServices={buySideServices}
        sellSideServices={sellSideServices}
        strategicServices={strategicServices}
        buySideDescription={meta.servicesDescription}
        sellSideDescription={meta.servicesDescription}
        strategicDescription={meta.servicesDescription}
        sectionSubtitle={meta.servicesSubtitle}
        sectionTitle={meta.servicesTitle}
        sectionDescription={meta.servicesDescription}
      />

      {/* Investment Criteria */}
      <section className="py-16 md:py-24">
        <Container>
          <SectionHeading
            subtitle={meta.targetSubtitle}
            title={meta.targetTitle}
          />

          {(financialCriteria.length > 0 || otherCriteria.length > 0) && (
          <div className="mb-12 grid gap-8 md:grid-cols-2">
            {financialCriteria.length > 0 && (
            <div className="rounded-xl border border-border bg-white p-8">
              <h3 className="mb-4 text-lg font-semibold text-text">
                {meta.financialCriteriaHeading || 'Financial Criteria'}
              </h3>
              <ul className="space-y-3 text-text-muted">
                {financialCriteria.map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-secondary" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            )}

            {otherCriteria.length > 0 && (
            <div className="rounded-xl border border-border bg-white p-8">
              <h3 className="mb-4 text-lg font-semibold text-text">
                {meta.otherCriteriaHeading || 'Other Criteria'}
              </h3>
              <ul className="space-y-3 text-text-muted">
                {otherCriteria.map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-secondary" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            )}
          </div>
          )}

          <h3 className="mb-6 text-center text-xl font-semibold text-text">
            {meta.industrySectorsHeading || 'Industry Sectors'}
          </h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {industrySectors.map((sector) => (
              <div
                key={sector.id}
                className="rounded-lg border border-border bg-surface p-5"
              >
                <h4 className="mb-2 font-semibold text-primary">
                  {sector.name}
                </h4>
                <p className="text-sm text-text-muted">{sector.description}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* Core Values */}
      <section className="bg-gradient-to-b from-surface to-surface-blue/30 py-16 md:py-24">
        <Container>
          <div className="mb-8 flex justify-center">
            <Image
              src="https://fca-assets-113862367661.s3.us-east-2.amazonaws.com/logos/fca-mountain-on-white.png"
              alt="Flatirons Capital Advisors"
              width={200}
              height={80}
              className="h-16 w-auto"
            />
          </div>
          <SectionHeading subtitle={meta.valuesSubtitle} title={meta.valuesTitle} />

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {coreValues.map((value) => (
              <div
                key={value.id}
                className="flex flex-col items-center rounded-xl border border-border bg-white p-6 text-center shadow-sm transition-all hover:border-secondary/30 hover:shadow-lg hover:shadow-primary/10"
              >
                <div className="relative mb-4 h-12 w-12">
                  <Image
                    src={value.icon}
                    alt={value.title}
                    fill
                    className="object-contain"
                    sizes="48px"
                  />
                </div>
                <h3 className="mb-2 font-semibold text-primary">{value.title}</h3>
                <p className="text-sm text-text-muted">{value.description}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      <CTASection
        title={meta.ctaTitle}
        description={meta.ctaDescription}
        ctaText={meta.ctaText}
      />
    </>
  );
}
