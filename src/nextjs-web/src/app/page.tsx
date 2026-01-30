import { Metadata } from 'next';
import { Hero } from '@/components/sections/Hero';
import { ServicesGrid } from '@/components/sections/ServicesGrid';
import { TransactionGrid } from '@/components/sections/TransactionGrid';
import { AwardsBar } from '@/components/sections/AwardsBar';
import { CTASection } from '@/components/sections/CTASection';
import { siteConfig } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Middle Market M&A Investment Bank',
  description:
    'Flatirons Capital Advisors is a North American mergers and acquisitions advisory firm specializing in lower middle-market transactions. Over 200 completed transactions.',
  alternates: {
    canonical: siteConfig.url,
  },
};

// Recent transactions for the homepage preview
const recentTransactions = [
  'World Resources Distribution',
  'Precision Pool and Spa',
  '5th Gear Auto',
  'Cummings Electric',
  'Pods Complete Car Care',
  'Prime Home Services Group',
  'ThriveMD',
  'Reliable Auto Care',
  'AEG Plexus',
  'MEC',
];

export default function HomePage() {
  return (
    <>
      <Hero
        title="Let us help you overshoot your goals."
        subtitle="Middle Market M&A Advisory"
        description="Flatirons Capital Advisors is a North American mergers and acquisitions advisory firm specializing in lower middle-market transactions. We have successfully completed over 200 transactions across a broad range of industries."
        ctaText="Start a Conversation"
        ctaHref="/contact"
        secondaryCtaText="View Transactions"
        secondaryCtaHref="/transactions"
      />
      
      <AwardsBar />
      
      <ServicesGrid />
      
      <TransactionGrid transactions={recentTransactions} limit={10} />
      
      <CTASection
        title="Ready to discuss your options?"
        description="With an exclusive focus on private businesses, we understand the challenges private business owners face. Our hands-on approach ensures personalized attention throughout the entire process."
        ctaText="Contact Us Today"
        ctaHref="/contact"
      />
    </>
  );
}
