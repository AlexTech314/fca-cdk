import type { Metadata } from 'next';
import { Container } from '@/components/ui/Container';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { Hero } from '@/components/sections/Hero';
import { NewsGrid } from '@/components/sections/NewsGrid';
import { ContentExplorer } from '@/components/sections/ContentExplorer';
import { getNewsArticles, getAllNewsIndustries, getPageData } from '@/lib/data';
import { fetchSiteConfig, pageMetadata } from '@/lib/utils';

interface NewsMetadata {
  metaDescription?: string;
  subtitle?: string;
  description?: string;
  sectionSubtitle?: string;
  sectionTitle?: string;
}

export async function generateMetadata(): Promise<Metadata> {
  const [config, pageContent] = await Promise.all([
    fetchSiteConfig(),
    getPageData('news'),
  ]);
  const meta = (pageContent?.metadata || {}) as NewsMetadata;
  return pageMetadata(config, {
    title: 'News & Insights',
    description: meta.metaDescription || config.description,
    canonical: `${config.url}/news`,
  });
}

export default async function NewsPage() {
  const [pageContent, articles, industries] = await Promise.all([
    getPageData('news'),
    getNewsArticles(),
    getAllNewsIndustries(),
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
            subtitle={meta.sectionSubtitle}
            title={meta.sectionTitle}
          />

          <NewsGrid articles={articles} emptyMessage="No news articles found." />

          <div className="mt-12">
            <ContentExplorer
              type="news"
              industries={industries}
            />
          </div>
        </Container>
      </section>
    </>
  );
}
