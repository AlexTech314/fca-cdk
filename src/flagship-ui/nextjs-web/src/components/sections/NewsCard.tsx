import Link from 'next/link';
import type { NewsArticleSummary } from '@/lib/types';

interface NewsCardProps {
  article: NewsArticleSummary;
  /** Optional: use compact style (e.g. in sidebars) */
  compact?: boolean;
}

/**
 * Single news article card: date, title, excerpt preview, and Read More link.
 * Use everywhere we display a news article (news listing, related news, transaction page, etc.).
 */
export function NewsCard({ article, compact = false }: NewsCardProps) {
  return (
    <Link
      href={`/news/${article.slug}`}
      className="group rounded-xl border border-border bg-white p-6 transition-all hover:border-secondary/30 hover:shadow-lg hover:shadow-primary/10"
    >
      <div className={compact ? 'mb-2' : 'mb-3'}>
        <span className="text-sm text-secondary">{article.date}</span>
      </div>
      <h2
        className={
          compact
            ? 'mb-2 text-base font-semibold text-text group-hover:text-primary'
            : 'mb-3 text-lg font-semibold text-text group-hover:text-primary'
        }
      >
        {article.title}
      </h2>
      {article.excerpt && (
        <p
          className={
            compact
              ? 'text-sm text-text-muted line-clamp-2'
              : 'text-sm text-text-muted line-clamp-3'
          }
        >
          {article.excerpt}
        </p>
      )}
      <div className={compact ? 'mt-3' : 'mt-4'}>
        <span className="inline-flex items-center gap-1 text-sm font-medium text-secondary group-hover:text-primary">
          Read More
          <svg
            className="h-4 w-4 transition-transform group-hover:translate-x-1"
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
        </span>
      </div>
    </Link>
  );
}
