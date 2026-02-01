import { Metadata } from 'next';
import Image from 'next/image';
import { Container } from '@/components/ui/Container';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { Hero } from '@/components/sections/Hero';
import { CTASection } from '@/components/sections/CTASection';
import { Button } from '@/components/ui/Button';
import { siteConfig } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'About',
  description:
    'Flatirons Capital Advisors is a leading mergers and acquisitions advisor to lower middle-market companies with decades of transaction advisory experience.',
  alternates: {
    canonical: `${siteConfig.url}/about`,
  },
};

const sellSideServices = [
  'Private Company Exits',
  'Recapitalizations',
  'Divestitures',
  'Product Line & IP Sales',
  'Generational Transfers',
];

const buySideServices = [
  'Acquisition Search',
  'Sponsor Services',
  'Buy-side Representation',
];

const strategicServices = ['Contract CFO', 'Growth Strategies', 'Optimizations'];

const industrySectors = [
  {
    name: 'Information Technology',
    description:
      'Hardware, Software (Big Data Business Analytics, ERP, etc.), Professional Services, Telecommunications, Biotech and Biomed Manufacturing Technologies',
  },
  {
    name: 'Distribution',
    description: 'Food & Beverage Services, Consumer Products',
  },
  {
    name: 'Energy',
    description: 'Oil & Gas Support Services and Manufacturing',
  },
  {
    name: 'Manufacturing',
    description:
      'Specialty Machinery, Aerospace, Fabricated Metal Products, Semiconductor, Surgical/Medical Equipment, Pharmaceutical',
  },
  {
    name: 'Healthcare',
    description:
      'Medical and Diagnostic Laboratories, Home Health Care Services, Specialized Urgent Care, Pharmacies',
  },
  {
    name: 'Business Services',
    description: 'Fire and Life Safety, HVAC, Specialty Construction, Supply Chain',
  },
];

const coreValues = [
  {
    title: 'Open and Honest Communication',
    description:
      'We speak our minds to our clients and demand the same from all others we work with.',
    icon: '/icons/comm.png',
  },
  {
    title: 'Listen Well, Act Quickly',
    description:
      'Every day we strive to listen well, seek counsel, then act decisively.',
    icon: '/icons/listen.png',
  },
  {
    title: 'Focus',
    description:
      'We tirelessly seek to understand your priorities and systematically refresh our objectives.',
    icon: '/icons/focus.png',
  },
  {
    title: 'Accountability',
    description:
      'We deliver on our commitments and are transparent about progress and outcomes.',
    icon: '/icons/accountability.png',
  },
  {
    title: 'Customer Satisfaction',
    description:
      'We only agree to what we can deliver, and always deliver what we agree to.',
    icon: '/icons/customer-satisfaction.png',
  },
  {
    title: 'Relentlessness',
    description:
      'We inspire ourselves and our teams to a higher state of performance and quality.',
    icon: '/icons/relentlessness.png',
  },
  {
    title: 'Respect',
    description:
      'We demand ourselves to be professional with every interaction, treating you with the utmost respect and honesty.',
    icon: '/icons/respect.png',
  },
  {
    title: 'Extraordinary Teamwork',
    description:
      'Every person has a role on our team. We communicate and count on everyone to play their part flawlessly.',
    icon: '/icons/teamwork.png',
  },
  {
    title: 'Intelligence',
    description:
      'We constantly drive creative ideas and bring the best practices to our Company and to you, our client.',
    icon: '/icons/intelligence.png',
  },
  {
    title: 'Bold Consistent Vision',
    description:
      'We deliver a compelling, shared vision that passes the elevator test of simplicity.',
    icon: '/icons/vision.png',
  },
];

export default function AboutPage() {
  return (
    <>
      <Hero
        title="Mergers & Acquisitions for Middle Markets"
        description="With decades of transaction advisory experience, our founders identified a growing need to bring together a more comprehensive suite of professional resources."
        compact
      />

      {/* Company Overview */}
      <section className="py-16 md:py-24">
        <Container>
          <div className="mx-auto max-w-3xl">
            <h2 className="mb-6 text-3xl font-bold text-primary">
              Flatirons Capital Advisors
            </h2>
            <div className="space-y-4 text-lg text-text-muted">
              <p>
                Flatirons Capital Advisors is a leading mergers and acquisitions
                advisor to lower middle-market companies.
              </p>
              <p>
                Our buyer relationships are crucial to our ongoing success in
                making markets for our clients and completing transactions in
                record time. We are constantly updating our key industry and
                investment criteria based on real-time feedback from our vast
                network of public and private buyers.
              </p>
              <p>
                The deal process is 100% managed by a senior team member and not
                pushed down to a junior analyst. This hands-on approach ensures
                a strategic and robust process for our clients.
              </p>
            </div>
            <div className="mt-8">
              <Button
                href="https://www.dropbox.com/scl/fi/c0u3a41rqnylsysj5tbpj/Flatirons-Brochure-2025.pdf?rlkey=gva0sl9j7uxumaji5e05zpn7n&st=hhocbgb9&dl=0"
                external
                variant="outline"
              >
                Download Corporate Overview (PDF)
              </Button>
            </div>
          </div>
        </Container>
      </section>

      {/* M&A Services */}
      <section className="bg-gradient-to-b from-surface to-surface-blue/30 py-16 md:py-24">
        <Container>
          <SectionHeading
            subtitle="Our Services"
            title="Mergers & Acquisitions"
            description="The focus of our advisory services is to help you make the right strategic moves to protect what you've built."
          />

          <div className="grid gap-8 md:grid-cols-3">
            {/* Buy-Side */}
            <div className="rounded-xl border border-border bg-white p-8 shadow-sm transition-all hover:border-secondary/30 hover:shadow-lg hover:shadow-primary/10">
              <h3 className="mb-4 text-xl font-semibold text-primary">
                Buy-side Advisory
              </h3>
              <ul className="space-y-3">
                {buySideServices.map((service) => (
                  <li
                    key={service}
                    className="flex items-center gap-2 text-text-muted"
                  >
                    <svg
                      className="h-4 w-4 flex-shrink-0 text-secondary"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    {service}
                  </li>
                ))}
              </ul>
              <div className="mt-6">
                <Button href="/buy-side" variant="ghost" size="sm">
                  Learn More →
                </Button>
              </div>
            </div>

            {/* Sell-Side */}
            <div className="rounded-xl border border-border bg-white p-8 shadow-sm transition-all hover:border-secondary/30 hover:shadow-lg hover:shadow-primary/10">
              <h3 className="mb-4 text-xl font-semibold text-primary">
                Sell-side Advisory
              </h3>
              <ul className="space-y-3">
                {sellSideServices.map((service) => (
                  <li
                    key={service}
                    className="flex items-center gap-2 text-text-muted"
                  >
                    <svg
                      className="h-4 w-4 flex-shrink-0 text-secondary"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    {service}
                  </li>
                ))}
              </ul>
              <div className="mt-6">
                <Button href="/sell-side" variant="ghost" size="sm">
                  Learn More →
                </Button>
              </div>
            </div>

            {/* Strategic Consulting */}
            <div className="rounded-xl border border-border bg-white p-8 shadow-sm transition-all hover:border-secondary/30 hover:shadow-lg hover:shadow-primary/10">
              <h3 className="mb-4 text-xl font-semibold text-primary">
                Strategic Consulting
              </h3>
              <ul className="space-y-3">
                {strategicServices.map((service) => (
                  <li
                    key={service}
                    className="flex items-center gap-2 text-text-muted"
                  >
                    <svg
                      className="h-4 w-4 flex-shrink-0 text-secondary"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    {service}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Container>
      </section>

      {/* Investment Criteria */}
      <section className="py-16 md:py-24">
        <Container>
          <SectionHeading
            subtitle="Target Profile"
            title="Industry Focus & Investment Criteria"
          />

          <div className="mb-12 grid gap-8 md:grid-cols-2">
            <div className="rounded-xl border border-border bg-white p-8">
              <h3 className="mb-4 text-lg font-semibold text-text">
                Financial Criteria
              </h3>
              <ul className="space-y-3 text-text-muted">
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-secondary" />
                  EBITDA greater than $2.0M
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-secondary" />
                  No minimal EBITDA requirement for add-on acquisitions
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-secondary" />
                  Increasing revenue
                </li>
              </ul>
            </div>

            <div className="rounded-xl border border-border bg-white p-8">
              <h3 className="mb-4 text-lg font-semibold text-text">
                Other Criteria
              </h3>
              <ul className="space-y-3 text-text-muted">
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-secondary" />
                  Strong 2nd tier management
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-secondary" />
                  Customer & revenue diversification
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-secondary" />
                  Competitive differentiation & healthy growth potential
                </li>
              </ul>
            </div>
          </div>

          <h3 className="mb-6 text-center text-xl font-semibold text-text">
            Industry Sectors
          </h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {industrySectors.map((sector) => (
              <div
                key={sector.name}
                className="rounded-lg border border-border bg-surface p-5"
              >
                <h4 className="mb-2 font-semibold text-primary">
                  {sector.name}
                </h4>
                <p className="text-sm text-text-muted">{sector.description}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* Core Values */}
      <section className="bg-gradient-to-b from-surface to-surface-blue/30 py-16 md:py-24">
        <Container>
          {/* FCA Logo Header */}
          <div className="mb-8 flex justify-center">
            <Image
              src="/logos/fca-mountain-on-white.png"
              alt="Flatirons Capital Advisors"
              width={200}
              height={80}
              className="h-16 w-auto"
            />
          </div>
          <SectionHeading subtitle="Our Principles" title="Core Values" />

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {coreValues.map((value) => (
              <div
                key={value.title}
                className="flex flex-col items-center rounded-xl border border-border bg-white p-6 text-center shadow-sm transition-all hover:border-secondary/30 hover:shadow-lg hover:shadow-primary/10"
              >
                <div className="relative mb-4 h-12 w-12">
                  <Image
                    src={value.icon}
                    alt={value.title}
                    fill
                    className="object-contain"
                    sizes="48px"
                  />
                </div>
                <h3 className="mb-2 font-semibold text-primary">{value.title}</h3>
                <p className="text-sm text-text-muted">{value.description}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      <CTASection />
    </>
  );
}
