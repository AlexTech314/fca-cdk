import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Container } from '@/components/ui/Container';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { NewsGrid } from '@/components/sections/NewsGrid';
import { ContentExplorer } from '@/components/sections/ContentExplorer';
import { getAllNewsTags, getNewsArticlesByTag, getTombstonesByTag } from '@/lib/data';
import { 
  formatTagName, 
  generateGroupingMetadata, 
  generateGroupingPageSchema 
} from '@/lib/seo';

interface PageProps {
  params: Promise<{ tag: string }>;
}

export async function generateStaticParams() {
  const tags = await getAllNewsTags();
  return tags.map((tag) => ({ tag }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { tag } = await params;
  const articles = await getNewsArticlesByTag(tag);
  
  if (articles.length === 0) {
    return { title: 'Tag Not Found' };
  }

  return generateGroupingMetadata('news-tag', tag, articles.length);
}

export default async function NewsByTagPage({ params }: PageProps) {
  const { tag } = await params;
  const articles = await getNewsArticlesByTag(tag);

  if (articles.length === 0) {
    notFound();
  }

  const displayName = formatTagName(tag);
  const breadcrumbs = [
    { name: 'Home', url: '/' },
    { name: 'News', url: '/news' },
    { name: displayName },
  ];

  const schema = await generateGroupingPageSchema({
    type: 'news-tag',
    value: tag,
    displayName,
    count: articles.length,
    breadcrumbs,
  });

  // Check if there are related transactions with this tag
  const relatedTombstones = await getTombstonesByTag(tag);

  // Fetch all news tags for ContentExplorer
  const newsTags = await getAllNewsTags();

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
              News by Topic
            </p>
            <h1 className="text-3xl font-bold text-text md:text-4xl">
              {displayName} News & Insights
            </h1>
            <p className="mt-4 text-lg text-text-muted">
              Read {articles.length} article{articles.length !== 1 ? 's' : ''} about {displayName.toLowerCase()} from Flatirons Capital Advisors.
            </p>
          </header>

          {relatedTombstones.length > 0 && (
            <div className="mb-8">
              <Link
                href={`/transactions/tag/${tag}`}
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2 text-sm text-text hover:border-primary hover:text-primary transition-colors"
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
                    d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                  />
                </svg>
                View {relatedTombstones.length} {displayName} transaction{relatedTombstones.length !== 1 ? 's' : ''}
              </Link>
            </div>
          )}

          <NewsGrid articles={articles} />

          <div className="mt-12">
            <ContentExplorer type="news" tags={newsTags} />
          </div>
        </Container>
      </section>
    </>
  );
}
