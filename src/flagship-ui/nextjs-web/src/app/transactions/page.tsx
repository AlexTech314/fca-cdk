import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { Container } from '@/components/ui/Container';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { Hero } from '@/components/sections/Hero';
import { CTASection } from '@/components/sections/CTASection';
import { ContentExplorer } from '@/components/sections/ContentExplorer';
import { fetchSiteConfig, pageMetadata } from '@/lib/utils';
import {
  getTombstones,
  getTombstoneFilterOptions,
  getPageData,
} from '@/lib/data';

interface TransactionsMetadata {
  metaDescription?: string;
  subtitle?: string;
  description?: string;
  sectionSubtitle?: string;
  sectionDescription?: string;
  ctaTitle?: string;
  ctaDescription?: string;
  ctaText?: string;
}

export async function generateMetadata(): Promise<Metadata> {
  const [config, pageContent] = await Promise.all([
    fetchSiteConfig(),
    getPageData('transactions'),
  ]);
  const meta = (pageContent?.metadata || {}) as TransactionsMetadata;
  return pageMetadata(config, {
    title: 'Transactions',
    description: meta.metaDescription || config.description,
    canonical: `${config.url}/transactions`,
  });
}

export default async function TransactionsPage() {
  const [pageContent, tombstones, filters] = await Promise.all([
    getPageData('transactions'),
    getTombstones(),
    getTombstoneFilterOptions(),
  ]);
  const meta = (pageContent?.metadata || {}) as TransactionsMetadata;

  return (
    <>
      <Hero
        title={pageContent?.title || 'Completed Transactions'}
        subtitle={meta.subtitle || 'Strategic Advice | Process Driven™'}
        description={meta.description || 'When it comes to closing a transaction, our clients value our advice, expertise and execution. Our commitment to excellence has allowed us to deliver world-class results.'}
        compact
      />

      <section className="py-16 md:py-24">
        <Container>
          <SectionHeading
            subtitle={meta.sectionSubtitle}
            title="Transactions Completed"
            description={meta.sectionDescription}
          />

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {tombstones.map((tombstone) => (
              <Link
                key={tombstone.slug}
                href={`/transactions/${tombstone.slug}`}
                className="group overflow-hidden border border-border bg-surface transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:shadow-black/10"
              >
                {tombstone.imagePath ? (
                  <div className="relative aspect-[391/450] w-full">
                    <Image
                      src={tombstone.imagePath}
                      alt={`${tombstone.seller} transaction`}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
                    />
                  </div>
                ) : (
                  <div className="flex aspect-[391/450] items-center justify-center p-4 text-center">
                    <span className="text-sm font-medium text-text-muted">
                      {tombstone.seller}
                    </span>
                  </div>
                )}
              </Link>
            ))}
          </div>

          <div className="mt-12">
            <ContentExplorer
              type="transactions"
              industries={filters.industries}
              states={filters.states}
              cities={filters.cities}
              years={filters.years}
            />
          </div>
        </Container>
      </section>

      <CTASection
        title={meta.ctaTitle || 'Ready to add your company to this list?'}
        description={meta.ctaDescription || 'Let us help you achieve your transaction goals with the same expertise and dedication we bring to every engagement.'}
        ctaText={meta.ctaText}
      />
    </>
  );
}
