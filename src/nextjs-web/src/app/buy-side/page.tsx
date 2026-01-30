import { Metadata } from 'next';
import { Container } from '@/components/ui/Container';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { Hero } from '@/components/sections/Hero';
import { CTASection } from '@/components/sections/CTASection';
import { Button } from '@/components/ui/Button';
import { siteConfig } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Buy-Side Advisory',
  description:
    'Buy-side M&A advisory services from Flatirons Capital Advisors. Acquisition search, sponsor services, and buy-side representation for strategic buyers.',
  alternates: {
    canonical: `${siteConfig.url}/buy-side`,
  },
};

const benefits = [
  'A "Free Look" with a strategic buyer in the identical/similar industry',
  'Gain insights and perspectives from a larger operator',
  'Determine if improvements are needed before an ultimate exit',
  'The timeline to closing is typically shorter',
  'Confidentiality is typically maintained because there\'s less activity',
];

const disadvantages = [
  'Only one buyer is involved',
  'Passing up the opportunity for multiple competing offers',
  'Potentially missing the ultimate, highest offer',
  'Not having an experienced M&A advisor by your side during every step',
];

export default function BuySidePage() {
  return (
    <>
      <Hero
        title="Buy-Side M&A Advisory"
        subtitle="A Free Look"
        description="Finding the simplest, shortest and most efficient solutions for our clients' desired outcomes."
        compact
      />

      {/* Introduction */}
      <section className="py-16 md:py-24">
        <Container>
          <div className="mx-auto max-w-3xl">
            <p className="text-lg text-text-muted leading-relaxed">
              Flatirons Capital Advisors loves finding the simplest, shortest and
              most efficient solutions for our clients&apos; desired outcomes. With
              our extensive knowledge of a broad range of industries and expansive
              relationships with strategic buyers across North America, in certain
              situations a possible solution for a business owner looking to
              retire or take some chips off the table is to take a buy-side
              approach to the sale.
            </p>
            <div className="mt-8 rounded-lg bg-surface p-6">
              <h3 className="mb-4 font-semibold text-text">
                Understanding the Process
              </h3>
              <ul className="space-y-3 text-text-muted">
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-secondary" />
                  The buyer is our client and pays our fees
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-secondary" />
                  A high-level description of the business owner&apos;s operations is
                  required
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-secondary" />
                  A 30-minute conference call takes place to determine if next
                  steps are warranted
                </li>
              </ul>
            </div>
          </div>
        </Container>
      </section>

      {/* Benefits & Disadvantages */}
      <section className="bg-surface py-16 md:py-24">
        <Container>
          <div className="grid gap-8 lg:grid-cols-2">
            {/* Benefits */}
            <div className="rounded-xl border border-border bg-white p-8">
              <h2 className="mb-6 text-xl font-bold text-text">
                Potential Benefits to the Business Owner
              </h2>
              <ul className="space-y-4">
                {benefits.map((benefit) => (
                  <li
                    key={benefit}
                    className="flex items-start gap-3 text-text-muted"
                  >
                    <svg
                      className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-500"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    {benefit}
                  </li>
                ))}
              </ul>
            </div>

            {/* Disadvantages */}
            <div className="rounded-xl border border-border bg-white p-8">
              <h2 className="mb-6 text-xl font-bold text-text">
                Key Disadvantages to the Business Owner
              </h2>
              <ul className="space-y-4">
                {disadvantages.map((disadvantage) => (
                  <li
                    key={disadvantage}
                    className="flex items-start gap-3 text-text-muted"
                  >
                    <svg
                      className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-500"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                    {disadvantage}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Container>
      </section>

      {/* Our Approach */}
      <section className="py-16 md:py-24">
        <Container>
          <SectionHeading subtitle="How We Work" title="Our Approach" />

          <div className="mx-auto max-w-3xl space-y-6 text-text-muted leading-relaxed">
            <p>
              Whether it&apos;s a buy-side or sell-side engagement, a key part of
              Flatirons Capital Advisors&apos; expertise lies with identifying and
              maintaining relationships with key strategic buyers that have the
              cash on hand and are actively acquiring businesses in the same
              industry as the business owner&apos;s operations.
            </p>
            <p>
              This reduces the chances of deal fatigue and any surprises the buyer
              might have if they didn&apos;t intimately understand the owner&apos;s
              business/industry.
            </p>
            <p>
              The due diligence process/timeline is usually more efficient because
              the buyer understands the industry/business operations, thus
              reducing friction points and the time to close. Further, it elevates
              the chances of a successful post-merger integration.
            </p>
            <p>
              Finally, the business owner can feel confident with the ultimate
              sale price because in this highly competitive market these buyers
              understand they must present strong, fair-market-values up front in
              order to consistently complete acquisitions.
            </p>
          </div>

          <div className="mt-12 text-center">
            <Button href="/transactions" variant="outline">
              View Our Transaction History
            </Button>
          </div>
        </Container>
      </section>

      <CTASection
        title="Interested in a buy-side approach?"
        description="Contact us to discuss whether a buy-side engagement might be the right fit for your situation."
      />
    </>
  );
}
