import { Metadata } from 'next';
import { Container } from '@/components/ui/Container';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { Hero } from '@/components/sections/Hero';
import { NewsGrid } from '@/components/sections/NewsGrid';
import { ContentExplorer } from '@/components/sections/ContentExplorer';
import { getNewsArticles, getAllNewsTags, getPageData } from '@/lib/data';
import { siteConfig } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'News & Insights',
  description:
    'Latest news, transaction announcements, and insights from Flatirons Capital Advisors. Stay updated on M&A activity in the lower middle market.',
  alternates: {
    canonical: `${siteConfig.url}/news`,
  },
};

interface NewsMetadata {
  subtitle?: string;
  description?: string;
}

export default async function NewsPage() {
  const [pageContent, articles, tags] = await Promise.all([
    getPageData('news'),
    getNewsArticles(),
    getAllNewsTags(),
  ]);

  const meta = (pageContent?.metadata || {}) as NewsMetadata;

  return (
    <>
      <Hero
        title={pageContent?.title || 'News & Insights'}
        subtitle={meta.subtitle || 'Recent Transaction Announcements'}
        description={meta.description || 'Stay updated on our latest M&A transactions and industry insights.'}
        compact
      />

      <section className="py-16 md:py-24">
        <Container>
          <SectionHeading
            subtitle="Latest Updates"
            title="Recent Announcements"
          />

          <NewsGrid articles={articles} emptyMessage="No news articles found." />

          <div className="mt-12">
            <ContentExplorer
              type="news"
              tags={tags}
            />
          </div>
        </Container>
      </section>
    </>
  );
}
