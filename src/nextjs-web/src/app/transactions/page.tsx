import { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { Container } from '@/components/ui/Container';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { Hero } from '@/components/sections/Hero';
import { CTASection } from '@/components/sections/CTASection';
import { ContentExplorer } from '@/components/sections/ContentExplorer';
import { siteConfig } from '@/lib/utils';
import { 
  getTombstones, 
  getAllTombstoneTags, 
  getAllStates, 
  getAllCities, 
  getAllTransactionYears 
} from '@/lib/data';

export const metadata: Metadata = {
  title: 'Transactions',
  description:
    'View our completed M&A transactions. Flatirons Capital Advisors has successfully completed over 200 transactions across multiple industries.',
  alternates: {
    canonical: `${siteConfig.url}/transactions`,
  },
};

export default async function TransactionsPage() {
  const [tombstones, tags, states, cities, years] = await Promise.all([
    getTombstones(),
    getAllTombstoneTags(),
    getAllStates(),
    getAllCities(),
    getAllTransactionYears(),
  ]);

  return (
    <>
      <Hero
        title="Completed Transactions"
        subtitle="Strategic Advice | Process Driven™"
        description="When it comes to closing a transaction, our clients value our advice, expertise and execution. Our commitment to excellence has allowed us to deliver world-class results."
        compact
      />

      <section className="py-16 md:py-24">
        <Container>
          <SectionHeading
            subtitle="Track Record"
            title={`${tombstones.length}+ Transactions Completed`}
            description="Our commitment to excellence has allowed us to deliver world-class results to the middle and lower middle markets."
          />

          <ContentExplorer
            type="transactions"
            tags={tags}
            states={states}
            cities={cities}
            years={years}
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
        </Container>
      </section>

      <CTASection
        title="Ready to add your company to this list?"
        description="Let us help you achieve your transaction goals with the same expertise and dedication we bring to every engagement."
      />
    </>
  );
}
