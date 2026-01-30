import Link from 'next/link';
import { Container } from '@/components/ui/Container';
import { SectionHeading } from '@/components/ui/SectionHeading';

const services = [
  {
    title: 'Sell-Side Advisory',
    description:
      "The focus of our sell-side advisory approach is on helping you make the right strategic moves to protect what you've built through years of hard work and sacrifice.",
    items: [
      'Private Company Exits',
      'Recapitalizations',
      'Divestitures',
      'Product Line & IP Sales',
      'Generational Transfers',
    ],
    href: '/about#sell-side',
    icon: (
      <svg
        className="h-8 w-8"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth="1.5"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941"
        />
      </svg>
    ),
  },
  {
    title: 'Buy-Side Advisory',
    description:
      'If your organization is considering an acquisition, leveraged buyout, joint venture, or alliance, Flatirons can support your search with a complete range of buy-side advisory services.',
    items: [
      'Acquisition Search',
      'Sponsor Services',
      'Buy-side Representation',
    ],
    href: '/buy-side',
    icon: (
      <svg
        className="h-8 w-8"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth="1.5"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
        />
      </svg>
    ),
  },
  {
    title: 'Strategic Consulting',
    description:
      'Strategy and business plan consulting from contract CFO and growth strategies to optimizations. We work with everyone from startups to Fortune 1000 public companies.',
    items: ['Contract CFO', 'Growth Strategies', 'Optimizations'],
    href: '/about#consulting',
    icon: (
      <svg
        className="h-8 w-8"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth="1.5"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6"
        />
      </svg>
    ),
  },
];

export function ServicesGrid() {
  return (
    <section className="bg-surface py-16 md:py-24">
      <Container>
        <SectionHeading
          subtitle="What We Do"
          title="M&A Services"
          description="Comprehensive mergers and acquisitions advisory services for lower middle-market companies."
        />

        <div className="grid gap-8 md:grid-cols-3">
          {services.map((service) => (
            <div
              key={service.title}
              className="group rounded-xl border border-border bg-white p-8 transition-all duration-200 hover:shadow-card-hover"
            >
              <div className="mb-4 inline-flex rounded-lg bg-primary/10 p-3 text-primary">
                {service.icon}
              </div>
              <h3 className="mb-3 text-xl font-semibold text-text">
                {service.title}
              </h3>
              <p className="mb-4 text-text-muted">{service.description}</p>
              <ul className="mb-6 space-y-2">
                {service.items.map((item) => (
                  <li
                    key={item}
                    className="flex items-center gap-2 text-sm text-text-muted"
                  >
                    <svg
                      className="h-4 w-4 text-secondary"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                href={service.href}
                className="inline-flex items-center gap-1 text-sm font-medium text-secondary transition-colors hover:text-primary"
              >
                Learn More
                <svg
                  className="h-4 w-4 transition-transform group-hover:translate-x-1"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="2"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                  />
                </svg>
              </Link>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
