import { Metadata } from 'next';
import { Container } from '@/components/ui/Container';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { Hero } from '@/components/sections/Hero';
import { CTASection } from '@/components/sections/CTASection';
import { Button } from '@/components/ui/Button';
import { siteConfig } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Sell-Side Advisory',
  description:
    'Sell-side M&A advisory services from Flatirons Capital Advisors. Private company exits, recapitalizations, divestitures, and generational transfers for business owners.',
  alternates: {
    canonical: `${siteConfig.url}/sell-side`,
  },
};

const sellSideServices = [
  {
    title: 'Private Company Exits',
    description:
      'Full-service representation for owners looking to sell their business, maximizing value through a competitive auction process.',
  },
  {
    title: 'Recapitalizations',
    description:
      'Helping owners take chips off the table while retaining ownership and continuing to grow with a financial or strategic partner.',
  },
  {
    title: 'Divestitures',
    description:
      'Strategic sale of business units, subsidiaries, or divisions to optimize your portfolio and focus on core operations.',
  },
  {
    title: 'Product Line & IP Sales',
    description:
      'Monetizing intellectual property, product lines, or technology assets through targeted sales to strategic acquirers.',
  },
  {
    title: 'Generational Transfers',
    description:
      'Facilitating smooth transitions of family businesses to the next generation or management teams.',
  },
];

const processSteps = [
  {
    step: '1',
    title: 'Discovery & Preparation',
    description:
      'We conduct a thorough assessment of your business, identify value drivers, and prepare comprehensive marketing materials.',
  },
  {
    step: '2',
    title: 'Market Outreach',
    description:
      'Leveraging our extensive buyer network, we confidentially approach qualified strategic and financial buyers.',
  },
  {
    step: '3',
    title: 'Manage the Process',
    description:
      'We facilitate management presentations, coordinate due diligence, and create competitive tension among buyers.',
  },
  {
    step: '4',
    title: 'Negotiate & Close',
    description:
      'We negotiate deal terms, manage the definitive agreement process, and guide you through to a successful closing.',
  },
];

const whyChooseUs = [
  'Senior-level attention throughout the entire process',
  'Extensive relationships with strategic and financial buyers',
  'Track record of 200+ completed transactions',
  'Deep industry expertise across multiple sectors',
  'Confidential and professional approach',
  'Proven ability to maximize value and deal terms',
];

export default function SellSidePage() {
  return (
    <>
      <Hero
        title="Sell-Side M&A Advisory"
        subtitle="Maximize Your Exit"
        description="The focus of our sell-side advisory approach is on helping you make the right strategic moves to protect what you've built through years of hard work and sacrifice."
        compact
      />

      {/* Introduction */}
      <section className="py-16 md:py-24">
        <Container>
          <div className="mx-auto max-w-3xl">
            <p className="text-lg text-text-muted leading-relaxed">
              At Flatirons Capital Advisors, we understand that selling your business
              is one of the most significant decisions you&apos;ll make. Our sell-side
              advisory services are designed to guide you through every step of the
              process, ensuring you achieve the best possible outcome while
              protecting what you&apos;ve built.
            </p>
            <p className="mt-4 text-lg text-text-muted leading-relaxed">
              With decades of experience and a hands-on approach from senior team
              members, we create competitive processes that attract the right buyers
              and maximize value for our clients.
            </p>
          </div>
        </Container>
      </section>

      {/* Services */}
      <section className="bg-gradient-to-b from-surface to-surface-blue/30 py-16 md:py-24">
        <Container>
          <SectionHeading
            subtitle="What We Offer"
            title="Sell-Side Services"
            description="Comprehensive advisory services tailored to your specific situation and goals."
          />

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {sellSideServices.map((service) => (
              <div
                key={service.title}
                className="rounded-xl border border-border bg-white p-6 shadow-sm transition-all hover:border-secondary/30 hover:shadow-lg hover:shadow-primary/10"
              >
                <h3 className="mb-3 text-lg font-semibold text-primary">
                  {service.title}
                </h3>
                <p className="text-text-muted">{service.description}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* Our Process */}
      <section className="py-16 md:py-24">
        <Container>
          <SectionHeading
            subtitle="How We Work"
            title="Our Proven Process"
            description="A structured approach that has delivered results for over 200 transactions."
          />

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {processSteps.map((step) => (
              <div key={step.step} className="relative">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-light text-xl font-bold text-white">
                  {step.step}
                </div>
                <h3 className="mb-2 text-lg font-semibold text-primary">
                  {step.title}
                </h3>
                <p className="text-text-muted">{step.description}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* Why Choose Us */}
      <section className="bg-gradient-to-b from-surface to-surface-blue/30 py-16 md:py-24">
        <Container>
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-secondary">
                The Flatirons Advantage
              </p>
              <h2 className="mb-6 text-3xl font-bold text-primary md:text-4xl">
                Why Choose Flatirons?
              </h2>
              <p className="text-lg text-text-muted">
                Our buyer relationships are crucial to our ongoing success in
                making markets for our clients and completing transactions in
                record time. The deal process is 100% managed by a senior team
                member and not pushed down to a junior analyst.
              </p>
            </div>

            <div className="rounded-xl border border-border bg-white p-8 shadow-sm">
              <ul className="space-y-4">
                {whyChooseUs.map((reason) => (
                  <li
                    key={reason}
                    className="flex items-start gap-3 text-text-muted"
                  >
                    <svg
                      className="mt-0.5 h-5 w-5 flex-shrink-0 text-secondary"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    {reason}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-12 text-center">
            <Button href="/transactions" variant="outline">
              View Our Transaction History
            </Button>
          </div>
        </Container>
      </section>

      <CTASection
        title="Ready to explore your options?"
        description="Contact us for a confidential conversation about your business and goals. We'll help you understand what's possible."
      />
    </>
  );
}
