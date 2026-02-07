import Link from 'next/link';
import type { NewsArticleSummary } from '@/lib/types';
import { NewsCard } from './NewsCard';

interface RelatedNewsSectionProps {
  title?: string;
  articles: NewsArticleSummary[];
  viewAllHref?: string;
  viewAllText?: string;
  /** Max cards to show before "view all" (default 6) */
  maxItems?: number;
  /** Grid columns: 2 or 3 (default 3) */
  columns?: 2 | 3;
}

/**
 * Related news block: heading + grid of NewsCards + optional "View all" link.
 * Use on news article page, transaction page, and grouping pages.
 */
export function RelatedNewsSection({
  title = 'Related News',
  articles,
  viewAllHref,
  viewAllText = 'View all news →',
  maxItems = 6,
  columns = 3,
}: RelatedNewsSectionProps) {
  if (articles.length === 0) return null;

  const show = articles.slice(0, maxItems);
  const hasMore = articles.length > maxItems;

  return (
    <div className="border-t border-border pt-8">
      <h2 className="mb-6 text-xl font-bold text-text">{title}</h2>
      <div
        className={
          columns === 2
            ? 'grid gap-6 md:grid-cols-2'
            : 'grid gap-6 md:grid-cols-2 lg:grid-cols-3'
        }
      >
        {show.map((article) => (
          <NewsCard key={article.slug} article={article} />
        ))}
      </div>
      {(hasMore || viewAllHref) && (
        <div className="mt-6 text-center">
          <Link
            href={viewAllHref ?? '/news'}
            className="inline-flex items-center gap-1 text-sm font-medium text-secondary hover:text-primary"
          >
            {hasMore && viewAllHref
              ? `View all ${articles.length} related articles →`
              : viewAllText}
          </Link>
        </div>
      )}
    </div>
  );
}
