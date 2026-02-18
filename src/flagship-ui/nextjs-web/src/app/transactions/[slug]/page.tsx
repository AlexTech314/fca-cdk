import { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Container } from '@/components/ui/Container';
import { CTASection } from '@/components/sections/CTASection';
import { ContentExplorer } from '@/components/sections/ContentExplorer';
import { RelatedNewsSection } from '@/components/sections/RelatedNewsSection';
import {
  getTombstone,
  getTombstones,
  findPressReleaseForTombstone,
  getRelatedNewsForTombstone,
  getTombstoneFilterOptions,
  getPageData,
} from '@/lib/data';
import { fetchSiteConfig } from '@/lib/utils';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const tombstones = await getTombstones();
  return tombstones.map((tombstone) => ({
    slug: tombstone.slug,
  }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const [tombstone, config] = await Promise.all([
    getTombstone(slug),
    fetchSiteConfig(),
  ]);

  if (!tombstone) {
    return {
      title: 'Transaction Not Found',
    };
  }

  const description = `${tombstone.seller} - ${tombstone.industry} transaction completed in ${tombstone.transactionYear}. ${tombstone.buyerPeFirm ? `Acquired by ${tombstone.buyerPlatform || tombstone.buyerPeFirm}.` : ''}`;

  return {
    title: `${tombstone.seller} | Transaction`,
    description,
    alternates: {
      canonical: `${config.url}/transactions/${slug}`,
    },
    openGraph: {
      title: `${tombstone.seller} | ${config.name}`,
      description,
      type: 'article',
    },
  };
}

export default async function TombstoneDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const tombstone = await getTombstone(slug);

  if (!tombstone) {
    notFound();
  }

  // Get the press release (1-to-1 relationship)
  const pressRelease = await findPressReleaseForTombstone(tombstone);
  
  // Get related news articles by matching tags (excludes press release)
  const relatedNews = await getRelatedNewsForTombstone(
    tombstone, 
    pressRelease?.slug || null
  );

  // Fetch data for ContentExplorer + transactions page CTA metadata
  const [filters, transactionsPage] = await Promise.all([
    getTombstoneFilterOptions(),
    getPageData('transactions'),
  ]);
  const tagNames = Object.fromEntries(filters.tags.map((t) => [t.slug, t.name]));
  const txMeta = (transactionsPage?.metadata || {}) as { ctaTitle?: string; ctaDescription?: string; ctaText?: string };

  return (
    <>
      {/* Breadcrumb */}
      <div className="border-b border-border bg-surface">
        <Container>
          <nav className="py-4">
            <ol className="flex items-center gap-2 text-sm text-text-muted">
              <li>
                <Link href="/" className="hover:text-primary">
                  Home
                </Link>
              </li>
              <li>/</li>
              <li>
                <Link href="/transactions" className="hover:text-primary">
                  Transactions
                </Link>
              </li>
              <li>/</li>
              <li className="text-text">{tombstone.seller}</li>
            </ol>
          </nav>
        </Container>
      </div>

      {/* Transaction Detail */}
      <article className="py-12 md:py-16">
        <Container>
          <div className="grid gap-12 lg:grid-cols-2">
            {/* Tombstone Image */}
            <div className="flex justify-center lg:justify-start">
              {tombstone.imagePath ? (
                <div className="relative aspect-[391/450] w-full max-w-md overflow-hidden border border-border shadow-lg">
                  <Image
                    src={tombstone.imagePath}
                    alt={`${tombstone.seller} transaction tombstone`}
                    fill
                    className="object-cover"
                    priority
                    sizes="(max-width: 768px) 100vw, 400px"
                  />
                </div>
              ) : (
                <div className="flex aspect-[391/450] w-full max-w-md items-center justify-center border border-border bg-surface p-8 text-center">
                  <span className="text-xl font-semibold text-text-muted">
                    {tombstone.seller}
                  </span>
                </div>
              )}
            </div>

            {/* Transaction Details */}
            <div>
              <header className="mb-8">
                <p className="mb-2 text-sm font-medium uppercase tracking-wider text-secondary">
                  {tombstone.transactionYear} Transaction
                </p>
                <h1 className="mb-4 text-3xl font-bold text-text md:text-4xl">
                  {tombstone.seller}
                </h1>
                <p className="text-lg text-text-muted">
                  {tombstone.industry}
                </p>
              </header>

              {/* Details Grid */}
              <div className="mb-8 grid gap-4 sm:grid-cols-2">
                {tombstone.buyerPeFirm && (
                  <div className="rounded-lg border border-border bg-surface p-4">
                    <p className="mb-1 text-xs font-medium uppercase tracking-wider text-text-light">
                      PE Firm
                    </p>
                    <p className="font-semibold text-text">
                      {tombstone.buyerPeFirm}
                    </p>
                  </div>
                )}

                {tombstone.buyerPlatform && (
                  <div className="rounded-lg border border-border bg-surface p-4">
                    <p className="mb-1 text-xs font-medium uppercase tracking-wider text-text-light">
                      Platform Company
                    </p>
                    <p className="font-semibold text-text">
                      {tombstone.buyerPlatform}
                    </p>
                  </div>
                )}

                {(tombstone.city || tombstone.state) && (
                  <div className="rounded-lg border border-border bg-surface p-4">
                    <p className="mb-1 text-xs font-medium uppercase tracking-wider text-text-light">
                      Location
                    </p>
                    <p className="font-semibold text-text">
                      {[tombstone.city, tombstone.state].filter(Boolean).join(', ')}
                    </p>
                  </div>
                )}

                <div className="rounded-lg border border-border bg-surface p-4">
                  <p className="mb-1 text-xs font-medium uppercase tracking-wider text-text-light">
                    Year Closed
                  </p>
                  <p className="font-semibold text-text">
                    {tombstone.transactionYear}
                  </p>
                </div>
              </div>

              {/* Tags */}
              {tombstone.tags.length > 0 && (
                <div className="mb-8">
                  <p className="mb-3 text-xs font-medium uppercase tracking-wider text-text-light">
                    Industry Focus
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {tombstone.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="rounded-full bg-primary/10 px-3 py-1 text-sm text-primary"
                      >
                        {tag.replace(/-/g, ' ')}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Press Release */}
          {pressRelease && (
            <div className="mt-16 border-t border-border pt-12">
              <h2 className="mb-6 text-2xl font-bold text-text">
                Press Release
              </h2>
              <Link
                href={`/news/${pressRelease.slug}`}
                className="group block rounded-lg border border-border bg-surface p-6 transition-all hover:border-primary/30 hover:shadow-card"
              >
                <p className="mb-2 text-sm text-secondary">{pressRelease.date}</p>
                <h3 className="mb-2 text-lg font-semibold text-text group-hover:text-primary">
                  {pressRelease.title}
                </h3>
                <p className="text-text-muted line-clamp-3">
                  {pressRelease.excerpt}
                </p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm text-primary">
                  Read full article
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </span>
              </Link>
            </div>
          )}

          {/* Related News (preview + Read More, same as news article page) */}
          {relatedNews.length > 0 && (
            <div className="mt-12">
              <RelatedNewsSection
                title="Related News"
                articles={relatedNews}
                viewAllHref="/news"
                viewAllText="View all news →"
                maxItems={6}
                columns={3}
              />
            </div>
          )}

          {/* Explore More Transactions */}
          <div className="mt-12 border-t border-border pt-8">
            <h2 className="mb-6 text-xl font-bold text-text">
              Explore More Transactions
            </h2>
            <ContentExplorer
              type="transactions"
              tags={filters.tags.map((t) => t.slug)}
              states={filters.states}
              cities={filters.cities}
              years={filters.years}
              tagNames={tagNames}
            />
          </div>

          {/* Back link */}
          <div className="mt-8">
            <Link
              href="/transactions"
              className="inline-flex items-center gap-2 text-secondary hover:text-primary"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="2"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
                />
              </svg>
              Back to All Transactions
            </Link>
          </div>
        </Container>
      </article>

      <CTASection
        title={txMeta.ctaTitle}
        description={txMeta.ctaDescription}
        ctaText={txMeta.ctaText}
      />
    </>
  );
}
