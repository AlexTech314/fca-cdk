import { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { Container } from '@/components/ui/Container';
import { getPreviewTombstone } from '@/lib/api';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ token?: string }>;
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Preview | Transaction',
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default async function PreviewTombstonePage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { token } = await searchParams;

  // Validate token is present
  if (!token) {
    notFound();
  }

  // Check if request is from an iframe
  const headersList = await headers();
  const secFetchDest = headersList.get('sec-fetch-dest');
  
  // In production, only allow iframe access
  if (process.env.NODE_ENV === 'production' && secFetchDest !== 'iframe') {
    redirect('/transactions');
  }

  // Fetch the tombstone with preview token
  const tombstone = await getPreviewTombstone(slug, token);

  if (!tombstone) {
    notFound();
  }

  return (
    <>
      {/* Preview Banner */}
      <div className="bg-amber-100 border-b border-amber-300">
        <Container>
          <div className="py-2 text-center text-sm text-amber-800">
            <strong>Preview Mode</strong> — This content is not published yet
          </div>
        </Container>
      </div>

      {/* Breadcrumb */}
      <div className="border-b border-border bg-surface">
        <Container>
          <nav className="py-4">
            <ol className="flex items-center gap-2 text-sm text-text-muted">
              <li>Preview</li>
              <li>/</li>
              <li>Transactions</li>
              <li>/</li>
              <li className="text-text font-medium">{tombstone.name}</li>
            </ol>
          </nav>
        </Container>
      </div>

      {/* Hero Section */}
      <section className="py-12 md:py-16">
        <Container>
          <div className="grid gap-8 lg:grid-cols-2 lg:gap-12 items-center">
            {/* Image */}
            <div className="aspect-[4/3] relative rounded-2xl overflow-hidden bg-surface shadow-lg">
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
                  <div className="text-center p-8">
                    <div className="text-6xl font-bold text-primary/20 mb-2">
                      {tombstone.name.charAt(0)}
                    </div>
                    <div className="text-text-muted text-sm">Transaction Preview</div>
                  </div>
                </div>
              )}
            </div>

            {/* Details */}
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-primary mb-4">
                {tombstone.name}
              </h1>
              
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="text-text-muted">Industry:</span>
                  <span className="font-medium text-text">{tombstone.industry}</span>
                </div>
                
                <div className="flex items-center gap-3">
                  <span className="text-text-muted">Year:</span>
                  <span className="font-medium text-text">{tombstone.transactionYear}</span>
                </div>

                {tombstone.city && (
                  <div className="flex items-center gap-3">
                    <span className="text-text-muted">Location:</span>
                    <span className="font-medium text-text">
                      {tombstone.city}, {tombstone.state}
                    </span>
                  </div>
                )}

                {tombstone.buyerPeFirm && (
                  <div className="flex items-center gap-3">
                    <span className="text-text-muted">PE Firm:</span>
                    <span className="font-medium text-text">{tombstone.buyerPeFirm}</span>
                  </div>
                )}

                {tombstone.buyerPlatform && (
                  <div className="flex items-center gap-3">
                    <span className="text-text-muted">Platform:</span>
                    <span className="font-medium text-text">{tombstone.buyerPlatform}</span>
                  </div>
                )}

                {/* Tags */}
                {tombstone.tags.length > 0 && (
                  <div className="pt-4">
                    <div className="text-text-muted mb-2">Tags:</div>
                    <div className="flex flex-wrap gap-2">
                      {tombstone.tags.map((tag) => (
                        <span
                          key={tag.id}
                          className="px-3 py-1 bg-surface text-text-muted text-sm rounded-full"
                        >
                          {tag.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Press Release */}
                {tombstone.pressRelease && (
                  <div className="pt-4">
                    <div className="text-text-muted mb-2">Press Release:</div>
                    <span className="text-primary font-medium">
                      {tombstone.pressRelease.title}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
