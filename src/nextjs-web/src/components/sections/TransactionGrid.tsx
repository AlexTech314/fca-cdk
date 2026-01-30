import Image from 'next/image';
import { Container } from '@/components/ui/Container';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { Button } from '@/components/ui/Button';
import { getTombstoneImage } from '@/lib/tombstones';

interface TransactionGridProps {
  transactions: string[];
  showAll?: boolean;
  limit?: number;
}

export function TransactionGrid({
  transactions,
  showAll = false,
  limit = 10,
}: TransactionGridProps) {
  const displayTransactions = showAll ? transactions : transactions.slice(0, limit);

  return (
    <section className="py-16 md:py-24">
      <Container>
        <SectionHeading
          subtitle="Track Record"
          title={showAll ? 'Completed Transactions' : 'Recent Transactions'}
          description="When it comes to closing a transaction, our clients value our advice, expertise and execution."
        />

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {displayTransactions.map((transaction, index) => {
            const tombstoneImage = getTombstoneImage(transaction);
            
            return (
              <div
                key={`${transaction}-${index}`}
                className="group overflow-hidden rounded-lg border border-border bg-surface transition-all hover:border-primary/30 hover:bg-white hover:shadow-card"
              >
                {tombstoneImage ? (
                  <div className="relative aspect-[391/450] w-full">
                    <Image
                      src={tombstoneImage}
                      alt={`${transaction} transaction`}
                      fill
                      className="object-cover transition-transform group-hover:scale-105"
                      sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
                    />
                  </div>
                ) : (
                  <div className="flex aspect-[391/450] items-center justify-center p-4 text-center">
                    <span className="text-sm font-medium text-text-muted">
                      {transaction}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {!showAll && transactions.length > limit && (
          <div className="mt-10 text-center">
            <Button href="/transactions" variant="outline">
              View All {transactions.length}+ Transactions
            </Button>
          </div>
        )}
      </Container>
    </section>
  );
}
