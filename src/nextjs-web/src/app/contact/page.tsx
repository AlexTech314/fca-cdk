import { Metadata } from 'next';
import { Container } from '@/components/ui/Container';
import { Hero } from '@/components/sections/Hero';
import { ContactInfo } from '@/components/sections/ContactInfo';
import { AwardsBar } from '@/components/sections/AwardsBar';
import { Button } from '@/components/ui/Button';
import { siteConfig, phoneHref, emailHref } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Contact',
  description:
    'Contact Flatirons Capital Advisors for M&A advisory services. Offices in Denver, Dallas, Miami, and Chicago. Call 303.319.4540.',
  alternates: {
    canonical: `${siteConfig.url}/contact`,
  },
};

const services = [
  'Deal Readiness',
  'Value Enhancement',
  'Foundation Services',
  'CFO Services',
];

export default function ContactPage() {
  return (
    <>
      <Hero
        title="Contact Us"
        subtitle="Let us help you overshoot your goals."
        description="Flatirons Capital Advisors provides lower middle-market companies with strategic consulting and M&A advisory services."
        compact
      />

      <ContactInfo />

      {/* Main Contact Section */}
      <section className="bg-surface py-16 md:py-24">
        <Container>
          <div className="grid gap-12 lg:grid-cols-2">
            {/* Contact Info */}
            <div>
              <h2 className="mb-6 text-2xl font-bold text-text">Get in Touch</h2>
              <div className="space-y-6">
                <div>
                  <h3 className="mb-2 font-semibold text-text">Phone</h3>
                  <a
                    href={phoneHref(siteConfig.phone)}
                    className="text-lg text-secondary hover:text-primary"
                  >
                    +1 {siteConfig.phone}
                  </a>
                </div>

                <div>
                  <h3 className="mb-2 font-semibold text-text">Email</h3>
                  <a
                    href={emailHref(siteConfig.email)}
                    className="text-lg text-secondary hover:text-primary"
                  >
                    {siteConfig.email}
                  </a>
                </div>

                <div>
                  <h3 className="mb-2 font-semibold text-text">LinkedIn</h3>
                  <a
                    href={siteConfig.linkedIn}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-lg text-secondary hover:text-primary"
                  >
                    Follow Us on LinkedIn
                  </a>
                </div>

                <div>
                  <h3 className="mb-4 font-semibold text-text">
                    Office Locations
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    {siteConfig.locations.map((loc) => (
                      <div
                        key={loc.city}
                        className="rounded-lg border border-border bg-white p-4"
                      >
                        <p className="font-medium text-text">{loc.city}</p>
                        <p className="text-sm text-text-muted">{loc.state}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4">
                  <Button
                    href="https://www.dropbox.com/scl/fi/c0u3a41rqnylsysj5tbpj/Flatirons-Brochure-2025.pdf?rlkey=gva0sl9j7uxumaji5e05zpn7n&st=hhocbgb9&dl=0"
                    external
                    variant="outline"
                  >
                    Download Corporate Overview (PDF)
                  </Button>
                </div>
              </div>
            </div>

            {/* Need Advice Section */}
            <div className="rounded-xl border border-border bg-white p-8">
              <h2 className="mb-2 text-2xl font-bold text-text">Need Advice?</h2>
              <p className="mb-6 text-text-muted">
                For companies that require buffing and polishing before being
                taken to market or desire improved financial and operational
                health, we provide:
              </p>

              <ul className="mb-8 space-y-3">
                {services.map((service) => (
                  <li
                    key={service}
                    className="flex items-center gap-3 text-text-muted"
                  >
                    <svg
                      className="h-5 w-5 flex-shrink-0 text-secondary"
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

              <div className="rounded-lg bg-primary/5 p-6">
                <p className="mb-2 text-sm text-text-muted">Call Us Directly</p>
                <a
                  href="tel:+19728033057"
                  className="text-2xl font-bold text-primary hover:text-primary-dark"
                >
                  +1-972-803-3057
                </a>
              </div>

              {/* Contact Form Placeholder */}
              <div className="mt-8 rounded-lg border-2 border-dashed border-border p-8 text-center">
                <p className="text-text-muted">
                  Contact form coming soon. In the meantime, please reach out
                  via phone or email.
                </p>
              </div>
            </div>
          </div>
        </Container>
      </section>

      <AwardsBar />
    </>
  );
}
