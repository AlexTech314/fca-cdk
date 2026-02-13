import type { Metadata } from 'next';
import { Container } from '@/components/ui/Container';
import { Hero } from '@/components/sections/Hero';
import { MarkdownContent } from '@/components/common/MarkdownContent';
import { fetchSiteConfig, pageMetadata } from '@/lib/utils';
import { getPageData, parseMarkdownContent } from '@/lib/data';

interface PrivacyMetadata {
  metaDescription?: string;
}

export async function generateMetadata(): Promise<Metadata> {
  const [config, pageContent] = await Promise.all([
    fetchSiteConfig(),
    getPageData('privacy-policy'),
  ]);
  const meta = (pageContent?.metadata || {}) as PrivacyMetadata;
  return pageMetadata(config, {
    title: 'Privacy Policy',
    description: meta.metaDescription || config.description,
    canonical: `${config.url}/privacy-policy`,
    robots: { index: false, follow: true },
  });
}

export default async function PrivacyPolicyPage() {
  const [pageContent, config] = await Promise.all([
    getPageData('privacy-policy'),
    fetchSiteConfig(),
  ]);

  const contentBlocks = pageContent?.content
    ? parseMarkdownContent(pageContent.content)
    : [];

  return (
    <>
      <Hero title={pageContent?.title || 'Privacy Policy'} compact />

      <section className="py-16 md:py-24">
        <Container>
          <div className="prose prose-lg mx-auto max-w-3xl">
            {contentBlocks.length > 0 ? (
              <MarkdownContent blocks={contentBlocks} />
            ) : (
              <p className="text-text-muted">
                Privacy policy content is being updated. Please contact us at{' '}
                {config.email} with any questions.
              </p>
            )}
          </div>
        </Container>
      </section>
    </>
  );
}
