import type { NewsArticle } from '@/lib/types';
import { NewsCard } from './NewsCard';

interface NewsGridProps {
  articles: NewsArticle[];
  emptyMessage?: string;
}

/**
 * Reusable grid component for displaying news articles (uses shared NewsCard).
 * Used by SEO grouping pages (news tag) and main news listing.
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
        <NewsCard
          key={article.slug}
          article={{
            slug: article.slug,
            title: article.title,
            date: article.date,
            excerpt: article.excerpt,
          }}
        />
      ))}
    </div>
  );
}
