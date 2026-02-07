import Link from 'next/link';
import { Container } from '@/components/ui/Container';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { TombstoneGrid } from '@/components/sections/TombstoneGrid';
import { RelatedNewsSection } from '@/components/sections/RelatedNewsSection';
import { ContentExplorer } from '@/components/sections/ContentExplorer';
import type { Tombstone } from '@/lib/types';
import type { NewsArticle } from '@/lib/types';
import type { BreadcrumbItem } from '@/lib/seo';

export type TransactionFilterType = 'year' | 'tag' | 'state' | 'city';

export interface TransactionsGroupingPageProps {
  schema: string;
  breadcrumbs: BreadcrumbItem[];
  filter: { type: TransactionFilterType; value: string };
  displayName: string;
  companyName?: string;
  tombstones: Tombstone[];
  tags: string[];
  states: string[];
  cities: string[];
  years: number[];
  relatedNews?: NewsArticle[];
  relatedNewsViewAllHref?: string;
  relatedNewsViewAllText?: string;
  yearNav?: {
    allYears: number[];
    prevYear: number | null;
    nextYear: number | null;
    currentYear: number;
  };
  cityFilter?: {
    cities: string[];
    cityToHref: (city: string) => string;
  };
  stateBackLink?: { stateName: string; href: string };
}

function getHeaderContent(
  type: TransactionFilterType,
  displayName: string,
  value: string,
  count: number,
  companyName: string
): { subtitle: string; title: string; description: string } {
  const plural = count !== 1 ? 's' : '';
  switch (type) {
    case 'year':
      return {
        subtitle: 'Transactions by Year',
        title: `${value} Completed Transactions`,
        description: `Review ${count} M&A transaction${plural} completed in ${value}.`,
      };
    case 'tag':
      return {
        subtitle: 'Transactions by Industry',
        title: `${displayName} M&A Transactions`,
        description: `Browse ${count} completed ${displayName.toLowerCase()} transaction${plural} from ${companyName}.`,
      };
    case 'state':
      return {
        subtitle: 'Transactions by State',
        title: `${displayName} M&A Transactions`,
        description: `Explore ${count} completed M&A transaction${plural} in ${displayName}.`,
      };
    case 'city':
      return {
        subtitle: 'Transactions by City',
        title: `${displayName} M&A Transactions`,
        description: `View ${count} completed M&A transaction${plural} in ${displayName}.`,
      };
    default:
      return {
        subtitle: 'Transactions',
        title: displayName,
        description: `${count} transaction${plural}.`,
      };
  }
}

export function TransactionsGroupingPage({
  schema,
  breadcrumbs,
  filter,
  displayName,
  companyName = 'Flatirons Capital Advisors',
  tombstones,
  tags,
  states,
  cities,
  years,
  relatedNews,
  relatedNewsViewAllHref = '/news',
  relatedNewsViewAllText = 'View all news →',
  yearNav,
  cityFilter,
  stateBackLink,
}: TransactionsGroupingPageProps) {
  const { subtitle, title, description } = getHeaderContent(
    filter.type,
    displayName,
    filter.value,
    tombstones.length,
    companyName
  );

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: schema }}
      />

      <section className="py-16 md:py-24">
        <Container>
          <Breadcrumb items={breadcrumbs} />

          <header className="mb-12">
            <p className="mb-2 text-sm font-medium uppercase tracking-wider text-secondary">
              {subtitle}
            </p>
            <h1 className="text-3xl font-bold text-text md:text-4xl">
              {title}
            </h1>
            <p className="mt-4 text-lg text-text-muted">{description}</p>
          </header>

          {/* State back link (city page) */}
          {stateBackLink && (
            <div className="mb-8">
              <Link
                href={stateBackLink.href}
                className="inline-flex items-center gap-2 text-sm text-secondary hover:text-primary transition-colors"
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
                View all {stateBackLink.stateName} transactions
              </Link>
            </div>
          )}

          {/* Year Navigation */}
          {yearNav && (
            <div className="mb-8 flex flex-wrap gap-2">
              <span className="mr-2 text-sm font-medium text-text-muted">
                Browse by year:
              </span>
              {yearNav.allYears.map((y) => (
                <Link
                  key={y}
                  href={`/transactions/year/${y}`}
                  className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                    y === yearNav.currentYear
                      ? 'border-primary bg-primary !text-white'
                      : 'border-border bg-white text-text hover:border-primary hover:text-primary'
                  }`}
                >
                  {y}
                </Link>
              ))}
            </div>
          )}

          {/* City filter (state page) */}
          {cityFilter && cityFilter.cities.length > 1 && (
            <div className="mb-8">
              <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-text-muted">
                Filter by City
              </h2>
              <div className="flex flex-wrap gap-2">
                {cityFilter.cities.map((city) => (
                  <Link
                    key={city}
                    href={cityFilter.cityToHref(city)}
                    className="rounded-full border border-border bg-white px-4 py-1.5 text-sm text-text hover:border-primary hover:text-primary transition-colors"
                  >
                    {city}
                  </Link>
                ))}
              </div>
            </div>
          )}

          <TombstoneGrid tombstones={tombstones} />

          {/* Related News (shared NewsCard + View all link) */}
          {relatedNews && relatedNews.length > 0 && (
            <div className="mt-16">
              <RelatedNewsSection
                title="Related News"
                articles={relatedNews.map((a) => ({
                  slug: a.slug,
                  title: a.title,
                  date: a.date,
                  excerpt: a.excerpt,
                }))}
                viewAllHref={relatedNewsViewAllHref}
                viewAllText={relatedNewsViewAllText}
                maxItems={3}
                columns={3}
              />
            </div>
          )}

          {/* Prev/Next Navigation (year page) */}
          {yearNav && (yearNav.prevYear !== null || yearNav.nextYear !== null) && (
            <div className="mt-12 flex justify-between">
              {yearNav.prevYear !== null ? (
                <Link
                  href={`/transactions/year/${yearNav.prevYear}`}
                  className="inline-flex items-center gap-2 text-secondary hover:text-primary transition-colors"
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
                  {yearNav.prevYear} Transactions
                </Link>
              ) : (
                <div />
              )}
              {yearNav.nextYear !== null ? (
                <Link
                  href={`/transactions/year/${yearNav.nextYear}`}
                  className="inline-flex items-center gap-2 text-secondary hover:text-primary transition-colors"
                >
                  {yearNav.nextYear} Transactions
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
                      d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                    />
                  </svg>
                </Link>
              ) : (
                <div />
              )}
            </div>
          )}

          <div className="mt-12">
            <ContentExplorer
              type="transactions"
              tags={tags}
              states={states}
              cities={cities}
              years={years}
            />
          </div>
        </Container>
      </section>
    </>
  );
}
