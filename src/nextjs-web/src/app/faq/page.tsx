import { Metadata } from 'next';
import { Container } from '@/components/ui/Container';
import { Hero } from '@/components/sections/Hero';
import { CTASection } from '@/components/sections/CTASection';
import { siteConfig } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'FAQ',
  description:
    'Frequently asked questions about M&A transactions, business valuation, and working with Flatirons Capital Advisors.',
  alternates: {
    canonical: `${siteConfig.url}/faq`,
  },
};

const faqs = [
  {
    question: 'Who is Flatirons Capital Advisors and what do you do?',
    answer: `We are, first and foremost, an investment banking firm—one that provides private businesses with growth strategy and exit planning advisory services. Our unique business model enables us to improve our sell-side advisory clients' positioning in market through leveraged growth and lean operations practices. The result is that clients enjoy a higher quality of earnings and both buyers and sellers achieve superior ROI through the business transformation services we provide.`,
  },
  {
    question:
      'What steps will Flatirons take to ensure the sale of my company is handled in a confidential manner?',
    answer: `Engaging a qualified transaction advisor like Flatirons is the first step to maintaining confidentiality. Our team of professional advisors can enhance and increase the universe of prospective buyers through our proprietary research methods, existing buyer relationships, and experience managing an effective and efficient buyer search process. We are constantly developing and networking with active buyers to ensure that your opportunity is only presented to serious, well-qualified buyers, not window shoppers. We will seek your approval, then require that a Confidentiality Agreement be executed by all buyer prospects before releasing any confidential information.`,
  },
  {
    question: 'Can Flatirons advise me with valuing my company?',
    answer: `Yes, we can provide a general range of value based on our experience. Determining an enterprise value is part of our exit planning process, and occurs early on in the relationship. We use the very same valuation methods that buyers use, and our valuations have proven to be consistently accurate when taken to market in a timely manner.`,
  },
  {
    question: 'Will Flatirons be with me throughout the entire M&A process?',
    answer: `Yes, whether you decide to engage Flatirons for stand-alone Business Advisory or M&A Advisory services, we will serve as your trusted advisor throughout the entire process.`,
  },
  {
    question: 'Does Flatirons perform stand-alone consulting services?',
    answer: `Yes, we do. Whether or not you are a "client" of Flatirons for full exit planning services, we can provide stand-alone consulting services to your company.`,
  },
  {
    question:
      'I have received an unsolicited offer for my company. Do I need to engage a professional investment banking firm?',
    answer: `Most business owners will only sell their companies once, and with so much of your personal net worth and future livelihood on the line, it makes sense to engage with an experienced professional who can manage the process. Based on our proprietary information and experience in the industry, we have found that unsolicited offers tend to be 20% or more below the winning offer when the same company is taken to market in a managed M&A process, which more than pays for the typical Success Fee. In addition, most business owners do not have sufficient knowledge of the M&A process, taxation, legal issues, and deal structure to protect themselves against sophisticated buyers.`,
  },
  {
    question:
      'I used an online "valuation calculator" and it said my company is worth a "multiple" of x. How accurate are these types of calculators?',
    answer: `Not very accurate. "Multiples" are used in the industry, AFTER detailed valuations have taken place and a deal is consummated, as a method of communicating the END result of a deal. Because there is so much variation among companies, their risk profile, terms and conditions of the deal, and synergy values of the buyer, multiples are simply not useful in "valuing" a company.`,
  },
  {
    question:
      'Are businesses valued based on a multiple of earnings or a multiple of revenues?',
    answer: `Without sounding repetitive, valuation multiples are not reliable in determining an accurate value for a business in a majority of cases. Buyers will calculate value based on several criteria that impact two primary value drivers: Risk and Return on Investment. Risk is calculated based upon operational factors that impact sustainability, growth potential and barriers to competition. Return on Investment is calculated based upon the conditions of the capital markets, synergies between the buying and selling companies, and the projected financial performance of the overall opportunity through the future.`,
  },
];

export default function FAQPage() {
  return (
    <>
      <Hero
        title="Frequently Asked Questions"
        description="Common questions about M&A transactions, business valuation, and working with our team."
        compact
      />

      <section className="py-16 md:py-24">
        <Container>
          <div className="mx-auto max-w-4xl">
            <div className="space-y-8">
              {faqs.map((faq, index) => (
                <div
                  key={index}
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
        title="Have more questions?"
        description="Our team is here to help. Reach out to discuss your specific situation and how we can assist."
        ctaText="Contact Us"
        ctaHref="/contact"
      />
    </>
  );
}
