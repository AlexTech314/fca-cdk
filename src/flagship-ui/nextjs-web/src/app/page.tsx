import type { Metadata } from 'next';
import { Hero } from '@/components/sections/Hero';
import { ServicesGrid } from '@/components/sections/ServicesGrid';
import { TransactionGrid } from '@/components/sections/TransactionGrid';
import { AwardsBar } from '@/components/sections/AwardsBar';
import { CTASection } from '@/components/sections/CTASection';
import { fetchSiteConfig } from '@/lib/utils';
import { getTombstones, getServicesByCategory, getPageData } from '@/lib/data';

export async function generateMetadata(): Promise<Metadata> {
  const [config, pageContent] = await Promise.all([
    fetchSiteConfig(),
    getPageData('home'),
  ]);
  const meta = (pageContent?.metadata || {}) as HomePageMetadata;
  return {
    title: meta.metaTitle || 'Middle Market M&A Investment Bank',
    description: meta.metaDescription || config.description,
    alternates: { canonical: config.url },
  };
}

// Type for homepage metadata
interface HomePageMetadata {
  metaTitle?: string;
  metaDescription?: string;
  subtitle?: string;
  description?: string;
  heroImage?: string;
  ctaText?: string;
  ctaHref?: string;
  secondaryCtaText?: string;
  secondaryCtaHref?: string;
  bottomCtaTitle?: string;
  bottomCtaDescription?: string;
  bottomCtaText?: string;
  bottomCtaHref?: string;
  buySideDescription?: string;
  sellSideDescription?: string;
  strategicDescription?: string;
  servicesSubtitle?: string;
  servicesTitle?: string;
  servicesDescription?: string;
  transactionsSubtitle?: string;
  transactionsTitle?: string;
  transactionsDescription?: string;
}

export default async function HomePage() {
  const [pageContent, tombstones, buySide, sellSide, strategic] = await Promise.all([
    getPageData('home'),
    getTombstones(),
    getServicesByCategory('buy-side', 'service'),
    getServicesByCategory('sell-side', 'service'),
    getServicesByCategory('strategic', 'service'),
  ]);

  const meta = (pageContent?.metadata || {}) as HomePageMetadata;

  return (
    <>
      <Hero
        title={pageContent?.title || ''}
        subtitle={meta.subtitle}
        description={meta.description}
        heroImage={meta.heroImage}
        ctaText={meta.ctaText}
        ctaHref={meta.ctaHref}
        secondaryCtaText={meta.secondaryCtaText}
        secondaryCtaHref={meta.secondaryCtaHref}
      />
      
      <AwardsBar />
      
      <ServicesGrid
        buySideServices={buySide.length > 0 ? buySide : undefined}
        sellSideServices={sellSide.length > 0 ? sellSide : undefined}
        strategicServices={strategic.length > 0 ? strategic : undefined}
        buySideDescription={meta.buySideDescription}
        sellSideDescription={meta.sellSideDescription}
        strategicDescription={meta.strategicDescription}
        sectionSubtitle={meta.servicesSubtitle}
        sectionTitle={meta.servicesTitle}
        sectionDescription={meta.servicesDescription}
      />
      
      <TransactionGrid
        tombstones={tombstones}
        limit={10}
        subtitle={meta.transactionsSubtitle}
        title={meta.transactionsTitle}
        description={meta.transactionsDescription}
      />
      
      <CTASection
        title={meta.bottomCtaTitle}
        description={meta.bottomCtaDescription}
        ctaText={meta.bottomCtaText}
        ctaHref={meta.bottomCtaHref}
      />
    </>
  );
}
