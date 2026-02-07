import { Metadata } from 'next';
import { Container } from '@/components/ui/Container';
import { Hero } from '@/components/sections/Hero';
import { MarkdownContent } from '@/components/common/MarkdownContent';
import { siteConfig } from '@/lib/utils';
import { getPageData, parseMarkdownContent } from '@/lib/data';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    'Privacy Policy for Flatirons Capital Advisors. Learn how we collect, use, and protect your personal information.',
  alternates: {
    canonical: `${siteConfig.url}/privacy-policy`,
  },
  robots: {
    index: false,
    follow: true,
  },
};

export default async function PrivacyPolicyPage() {
  const pageContent = await getPageData('privacy-policy');

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
                {siteConfig.email} with any questions.
              </p>
            )}
          </div>
        </Container>
      </section>
    </>
  );
}
