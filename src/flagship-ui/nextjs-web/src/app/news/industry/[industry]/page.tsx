import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Container } from '@/components/ui/Container';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { NewsGrid } from '@/components/sections/NewsGrid';
import { ContentExplorer } from '@/components/sections/ContentExplorer';
import { getAllNewsIndustries, getNewsArticlesByIndustry, getTombstonesByIndustry } from '@/lib/data';
import { fetchSiteConfig } from '@/lib/utils';
import { 
  formatSlug, 
  generateGroupingMetadata, 
  generateGroupingPageSchema 
} from '@/lib/seo';

interface PageProps {
  params: Promise<{ industry: string }>;
}

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { industry } = await params;
  const articles = await getNewsArticlesByIndustry(industry);
  
  if (articles.length === 0) {
    return { title: 'Industry Not Found' };
  }

  return generateGroupingMetadata('news-industry', industry, articles.length);
}

export default async function NewsByIndustryPage({ params }: PageProps) {
  const { industry } = await params;
  const articles = await getNewsArticlesByIndustry(industry);

  if (articles.length === 0) {
    notFound();
  }

  const displayName = formatSlug(industry);
  const breadcrumbs = [
    { name: 'Home', url: '/' },
    { name: 'News', url: '/news' },
    { name: displayName },
  ];

  const schema = await generateGroupingPageSchema({
    type: 'news-industry',
    value: industry,
    displayName,
    count: articles.length,
    breadcrumbs,
  });

  const relatedTombstones = await getTombstonesByIndustry(industry);

  const [newsIndustries, config] = await Promise.all([getAllNewsIndustries(), fetchSiteConfig()]);

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
              Read {articles.length} article{articles.length !== 1 ? 's' : ''} about {displayName.toLowerCase()} from {config.name}.
            </p>
          </header>

          {relatedTombstones.length > 0 && (
            <div className="mb-8">
              <Link
                href={`/transactions/industry/${industry}`}
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
            <ContentExplorer type="news" industries={newsIndustries} />
          </div>
        </Container>
      </section>
    </>
  );
}
