import { Metadata } from 'next';
import { Hero } from '@/components/sections/Hero';
import { ServicesGrid } from '@/components/sections/ServicesGrid';
import { TransactionGrid } from '@/components/sections/TransactionGrid';
import { AwardsBar } from '@/components/sections/AwardsBar';
import { CTASection } from '@/components/sections/CTASection';
import { siteConfig } from '@/lib/utils';
import { getTombstones, getServicesByCategory } from '@/lib/data';
import { getPageContent } from '@/lib/api';

export const metadata: Metadata = {
  title: 'Middle Market M&A Investment Bank',
  description:
    'Flatirons Capital Advisors is a North American mergers and acquisitions advisory firm specializing in lower middle-market transactions. Over 200 completed transactions.',
  alternates: {
    canonical: siteConfig.url,
  },
};

// Type for homepage metadata
interface HomePageMetadata {
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
}

// Default values (fallback if API fails)
const defaultHero = {
  title: 'Let us help you overshoot your goals.',
  subtitle: 'Middle Market M&A Advisory',
  description: 'Flatirons Capital Advisors is a North American mergers and acquisitions advisory firm specializing in lower middle-market transactions. We have successfully completed over 200 transactions across a broad range of industries.',
  heroImage: '/flatironshero.jpg',
  ctaText: 'Start a Conversation',
  ctaHref: '/contact',
  secondaryCtaText: 'View Transactions',
  secondaryCtaHref: '/transactions',
};

const defaultCta = {
  title: 'Ready to discuss your options?',
  description: 'With an exclusive focus on private businesses, we understand the challenges private business owners face. Our hands-on approach ensures personalized attention throughout the entire process.',
  ctaText: 'Contact Us Today',
  ctaHref: '/contact',
};

export default async function HomePage() {
  // Fetch page content, tombstones, and services in parallel
  const [pageContent, tombstones, buySide, sellSide, strategic] = await Promise.all([
    getPageContent('home').catch(() => null),
    getTombstones(),
    getServicesByCategory('buy-side', 'service'),
    getServicesByCategory('sell-side', 'service'),
    getServicesByCategory('strategic', 'service'),
  ]);

  // Extract metadata with fallbacks
  const meta = (pageContent?.metadata || {}) as HomePageMetadata;
  
  const heroProps = {
    title: pageContent?.title || defaultHero.title,
    subtitle: meta.subtitle || defaultHero.subtitle,
    description: meta.description || defaultHero.description,
    heroImage: meta.heroImage || defaultHero.heroImage,
    ctaText: meta.ctaText || defaultHero.ctaText,
    ctaHref: meta.ctaHref || defaultHero.ctaHref,
    secondaryCtaText: meta.secondaryCtaText || defaultHero.secondaryCtaText,
    secondaryCtaHref: meta.secondaryCtaHref || defaultHero.secondaryCtaHref,
  };

  const ctaProps = {
    title: meta.bottomCtaTitle || defaultCta.title,
    description: meta.bottomCtaDescription || defaultCta.description,
    ctaText: meta.bottomCtaText || defaultCta.ctaText,
    ctaHref: meta.bottomCtaHref || defaultCta.ctaHref,
  };

  return (
    <>
      <Hero
        title={heroProps.title}
        subtitle={heroProps.subtitle}
        description={heroProps.description}
        heroImage={heroProps.heroImage}
        ctaText={heroProps.ctaText}
        ctaHref={heroProps.ctaHref}
        secondaryCtaText={heroProps.secondaryCtaText}
        secondaryCtaHref={heroProps.secondaryCtaHref}
      />
      
      <AwardsBar />
      
      <ServicesGrid
        buySideServices={buySide.length > 0 ? buySide : undefined}
        sellSideServices={sellSide.length > 0 ? sellSide : undefined}
        strategicServices={strategic.length > 0 ? strategic : undefined}
      />
      
      <TransactionGrid tombstones={tombstones} limit={10} />
      
      <CTASection
        title={ctaProps.title}
        description={ctaProps.description}
        ctaText={ctaProps.ctaText}
        ctaHref={ctaProps.ctaHref}
      />
    </>
  );
}
