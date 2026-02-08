'use client';

import Image from 'next/image';
import { EditableField } from '../EditableField';
import { useAdminPage } from '../AdminPageContext';

interface Tombstone {
  slug: string;
  seller: string;
  imagePath?: string;
}

interface EditableTransactionGridProps {
  tombstones: Tombstone[];
  limit?: number;
}

/**
 * Editable version of TransactionGrid.
 * Section heading fields are editable; tombstone cards are read-only
 * (tombstones are separate DB entities managed via future CRUD pages).
 */
export function EditableTransactionGrid({
  tombstones,
  limit = 10,
}: EditableTransactionGridProps) {
  const { data, updateField, dirtyFields } = useAdminPage();
  const meta = data.metadata;

  const displayTombstones = tombstones.filter((t) => t.imagePath).slice(0, limit);

  return (
    <section className="py-16 md:py-24">
      <div className="container-max">
        {/* Section heading - editable */}
        <div className="mb-12 text-center">
          <EditableField
            fieldKey="transactionsSubtitle"
            value={meta.transactionsSubtitle || ''}
            onChange={updateField}
            as="p"
            className="mb-2 text-sm font-semibold uppercase tracking-wider text-secondary"
            isDirty={dirtyFields.has('transactionsSubtitle')}
            placeholder="Section subtitle..."
          />
          <EditableField
            fieldKey="transactionsTitle"
            value={meta.transactionsTitle || ''}
            onChange={updateField}
            as="h2"
            className="text-3xl font-bold text-primary md:text-4xl"
            isDirty={dirtyFields.has('transactionsTitle')}
            placeholder="Section title..."
          />
          <EditableField
            fieldKey="transactionsDescription"
            value={meta.transactionsDescription || ''}
            onChange={updateField}
            as="p"
            className="mx-auto mt-4 max-w-2xl text-lg text-text-muted"
            isDirty={dirtyFields.has('transactionsDescription')}
            placeholder="Section description..."
          />
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {displayTombstones.map((tombstone) => (
            <div
              key={tombstone.slug}
              className="group overflow-hidden border border-border bg-white transition-all duration-200"
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
            </div>
          ))}
        </div>

        {tombstones.length > limit && (
          <div className="mt-10 text-center">
            <span className="inline-flex items-center justify-center rounded-md border border-border px-6 py-3 text-sm font-medium text-text-muted">
              View All Transactions
            </span>
          </div>
        )}
      </div>
    </section>
  );
}
