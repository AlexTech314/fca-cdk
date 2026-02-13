import Link from 'next/link';
import { Container } from '@/components/ui/Container';
import { SectionHeading } from '@/components/ui/SectionHeading';
import type { ApiServiceOffering } from '@/lib/api';

interface ServiceCategory {
  title: string;
  description: string;
  items: ApiServiceOffering[];
  href: string;
  icon: React.ReactNode;
}

interface ServicesGridProps {
  /** Override the default service categories. If not provided, uses hardcoded defaults. */
  buySideServices?: ApiServiceOffering[];
  sellSideServices?: ApiServiceOffering[];
  strategicServices?: ApiServiceOffering[];
  buySideDescription?: string;
  sellSideDescription?: string;
  strategicDescription?: string;
  sectionSubtitle?: string;
  sectionTitle?: string;
  sectionDescription?: string;
}

const searchIcon = (
  <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
  </svg>
);

const chartIcon = (
  <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
  </svg>
);

const analyticsIcon = (
  <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6" />
  </svg>
);

export function ServicesGrid({
  buySideServices,
  sellSideServices,
  strategicServices,
  buySideDescription,
  sellSideDescription,
  strategicDescription,
  sectionSubtitle,
  sectionTitle,
  sectionDescription,
}: ServicesGridProps) {
  const categories: ServiceCategory[] = [
    {
      title: 'Buy-Side Advisory',
      description: buySideDescription || '',
      items: buySideServices || [],
      href: '/buy-side',
      icon: searchIcon,
    },
    {
      title: 'Sell-Side Advisory',
      description: sellSideDescription || '',
      items: sellSideServices || [],
      href: '/sell-side',
      icon: chartIcon,
    },
    {
      title: 'Strategic Consulting',
      description: strategicDescription || '',
      items: strategicServices || [],
      href: '/about',
      icon: analyticsIcon,
    },
  ];

  return (
    <section className="bg-gradient-to-b from-surface to-surface-blue/30 py-16 md:py-24">
      <Container>
        <SectionHeading
          subtitle={sectionSubtitle}
          title={sectionTitle}
          description={sectionDescription}
        />

        <div className="grid gap-8 md:grid-cols-3">
          {categories.map((category) => (
            <div
              key={category.title}
              className="group flex h-full flex-col rounded-xl border border-border bg-white p-8 shadow-sm transition-all duration-200 hover:border-secondary/30 hover:shadow-lg hover:shadow-primary/10"
            >
              <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-primary/10 to-secondary/10 text-primary">
                {category.icon}
              </div>
              <h3 className="mb-3 text-xl font-semibold text-primary">
                {category.title}
              </h3>
              <p className="mb-4 text-text-muted">{category.description}</p>
              <ul className="mb-6 space-y-2">
                {category.items.map((item) => (
                  <li
                    key={item.id}
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
                    {item.title}
                  </li>
                ))}
              </ul>
              <div className="mt-auto flex justify-end">
                <Link
                  href={category.href}
                  className="inline-flex items-center gap-1 text-sm font-medium text-secondary transition-colors hover:text-primary"
                >
                  {`Learn more about ${category.title}`}
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
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
