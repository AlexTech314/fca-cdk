import Image from 'next/image';
import Link from 'next/link';
import { Container } from '@/components/ui/Container';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { Button } from '@/components/ui/Button';
import type { Tombstone } from '@/lib/types';

interface TransactionGridProps {
  tombstones: Tombstone[];
  showAll?: boolean;
  limit?: number;
  subtitle?: string;
  title?: string;
  description?: string;
}

export function TransactionGrid({
  tombstones,
  showAll = false,
  limit = 10,
  subtitle,
  title,
  description,
}: TransactionGridProps) {
  const withImages = tombstones.filter((t) => t.imagePath);
  const displayTombstones = showAll ? tombstones : withImages.slice(0, limit);

  return (
    <section className="py-16 md:py-24">
      <Container>
        <SectionHeading
          subtitle={subtitle}
          title={title || (showAll ? 'Completed Transactions' : 'Recent Transactions')}
          description={description}
        />

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {displayTombstones.map((tombstone) => (
            <Link
              key={tombstone.slug}
              href={`/transactions/${tombstone.slug}`}
              className="group overflow-hidden border border-border bg-white transition-all duration-200 hover:-translate-y-1 hover:border-secondary/30 hover:shadow-lg hover:shadow-primary/10"
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

        {!showAll && tombstones.length > limit && (
          <div className="mt-10 text-center">
            <Button href="/transactions" variant="outline">
              View All Transactions
            </Button>
          </div>
        )}
      </Container>
    </section>
  );
}
