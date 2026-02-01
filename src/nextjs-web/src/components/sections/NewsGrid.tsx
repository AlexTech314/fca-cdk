import Link from 'next/link';
import type { NewsArticle } from '@/lib/types';

interface NewsGridProps {
  articles: NewsArticle[];
  emptyMessage?: string;
}

/**
 * Reusable grid component for displaying news articles
 * Used by SEO grouping pages (news tag)
 */
export function NewsGrid({ articles, emptyMessage = 'No articles found.' }: NewsGridProps) {
  if (articles.length === 0) {
    return (
      <p className="py-12 text-center text-text-muted">{emptyMessage}</p>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {articles.map((article) => (
        <Link
          key={article.slug}
          href={`/news/${article.slug}`}
          className="group rounded-xl border border-border bg-white p-6 transition-all hover:border-secondary/30 hover:shadow-lg hover:shadow-primary/10"
        >
          <div className="mb-3">
            <span className="text-sm text-secondary">{article.date}</span>
          </div>
          <h2 className="mb-3 text-lg font-semibold text-text group-hover:text-primary">
            {article.title}
          </h2>
          <p className="text-sm text-text-muted line-clamp-3">
            {article.excerpt}
          </p>
          <div className="mt-4">
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
      ))}
    </div>
  );
}
