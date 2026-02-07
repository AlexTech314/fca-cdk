import { Metadata } from 'next';
import { Container } from '@/components/ui/Container';
import { Hero } from '@/components/sections/Hero';
import { CTASection } from '@/components/sections/CTASection';
import { siteConfig } from '@/lib/utils';
import { getPageData, getAllFAQs } from '@/lib/data';

export const metadata: Metadata = {
  title: 'FAQ',
  description:
    'Frequently asked questions about M&A transactions, business valuation, and working with Flatirons Capital Advisors.',
  alternates: {
    canonical: `${siteConfig.url}/faq`,
  },
};

interface FAQMetadata {
  description?: string;
  ctaTitle?: string;
  ctaDescription?: string;
}

export default async function FAQPage() {
  const [pageContent, faqs] = await Promise.all([
    getPageData('faq'),
    getAllFAQs(),
  ]);

  const meta = (pageContent?.metadata || {}) as FAQMetadata;

  return (
    <>
      <Hero
        title={pageContent?.title || 'Frequently Asked Questions'}
        description={meta.description || 'Common questions about M&A transactions, business valuation, and working with our team.'}
        compact
      />

      <section className="py-16 md:py-24">
        <Container>
          <div className="mx-auto max-w-4xl">
            <div className="space-y-8">
              {faqs.map((faq, index) => (
                <div
                  key={faq.id}
                  className="rounded-xl border border-border bg-white p-6 md:p-8"
                >
                  <h2 className="mb-4 text-lg font-semibold text-text md:text-xl">
                    {index + 1}. {faq.question}
                  </h2>
                  <p className="text-text-muted leading-relaxed">{faq.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </Container>
      </section>

      <CTASection
        title={meta.ctaTitle || 'Have more questions?'}
        description={meta.ctaDescription || 'Our team is here to help. Reach out to discuss your specific situation and how we can assist.'}
        ctaText="Contact Us"
        ctaHref="/contact"
      />
    </>
  );
}
