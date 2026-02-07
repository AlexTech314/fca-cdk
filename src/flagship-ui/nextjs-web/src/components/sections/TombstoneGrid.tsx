import Image from 'next/image';
import Link from 'next/link';
import type { Tombstone } from '@/lib/types';

interface TombstoneGridProps {
  tombstones: Tombstone[];
  emptyMessage?: string;
}

/**
 * Reusable grid component for displaying tombstones
 * Used by SEO grouping pages (tag, state, city, year)
 */
export function TombstoneGrid({ tombstones, emptyMessage = 'No transactions found.' }: TombstoneGridProps) {
  if (tombstones.length === 0) {
    return (
      <p className="py-12 text-center text-text-muted">{emptyMessage}</p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {tombstones.map((tombstone) => (
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
  );
}
