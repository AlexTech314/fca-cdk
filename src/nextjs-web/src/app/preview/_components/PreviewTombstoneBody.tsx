import Image from 'next/image';
import { Container } from '@/components/ui/Container';
import type { ApiTombstone } from '@/lib/api';

interface PreviewTombstoneBodyProps {
  tombstone: ApiTombstone;
}

export function PreviewTombstoneBody({ tombstone }: PreviewTombstoneBodyProps) {
  return (
    <section className="py-12 md:py-16">
      <Container>
        <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-12">
          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-surface shadow-lg">
            {tombstone.imagePath ? (
              <Image
                src={tombstone.imagePath}
                alt={`${tombstone.name} transaction`}
                fill
                className="object-contain p-8"
                priority
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
                <div className="p-8 text-center">
                  <div className="mb-2 text-6xl font-bold text-primary/20">
                    {tombstone.name.charAt(0)}
                  </div>
                  <div className="text-sm text-text-muted">
                    Transaction Preview
                  </div>
                </div>
              </div>
            )}
          </div>

          <div>
            <h1 className="mb-4 text-3xl font-bold text-primary md:text-4xl">
              {tombstone.name}
            </h1>

            <div className="space-y-4">
              {tombstone.industry && (
                <div className="flex items-center gap-3">
                  <span className="text-text-muted">Industry:</span>
                  <span className="font-medium text-text">
                    {tombstone.industry}
                  </span>
                </div>
              )}

              {tombstone.transactionYear && (
                <div className="flex items-center gap-3">
                  <span className="text-text-muted">Year:</span>
                  <span className="font-medium text-text">
                    {tombstone.transactionYear}
                  </span>
                </div>
              )}

              {tombstone.city && (
                <div className="flex items-center gap-3">
                  <span className="text-text-muted">Location:</span>
                  <span className="font-medium text-text">
                    {tombstone.city}
                    {tombstone.state ? `, ${tombstone.state}` : ''}
                  </span>
                </div>
              )}

              {tombstone.buyerPeFirm && (
                <div className="flex items-center gap-3">
                  <span className="text-text-muted">PE Firm:</span>
                  <span className="font-medium text-text">
                    {tombstone.buyerPeFirm}
                  </span>
                </div>
              )}

              {tombstone.buyerPlatform && (
                <div className="flex items-center gap-3">
                  <span className="text-text-muted">Platform:</span>
                  <span className="font-medium text-text">
                    {tombstone.buyerPlatform}
                  </span>
                </div>
              )}

              {tombstone.tags.length > 0 && (
                <div className="pt-4">
                  <div className="mb-2 text-text-muted">Tags:</div>
                  <div className="flex flex-wrap gap-2">
                    {tombstone.tags.map((tag) => (
                      <span
                        key={tag.id}
                        className="rounded-full bg-surface px-3 py-1 text-sm text-text-muted"
                      >
                        {tag.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {tombstone.pressRelease && (
                <div className="pt-4">
                  <div className="mb-2 text-text-muted">Press Release:</div>
                  <span className="font-medium text-primary">
                    {tombstone.pressRelease.title}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
