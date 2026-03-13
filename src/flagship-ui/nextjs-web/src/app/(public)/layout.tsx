import { fetchSiteConfig } from '@/lib/utils';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { PageViewTracker } from '@/components/PageViewTracker';

export default async function PublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const config = await fetchSiteConfig();

  // JSON-LD Organization Schema
  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'FinancialService',
    name: config.name,
    description: config.description,
    url: config.url,
    logo: 'https://d1bjh7dvpwoxii.cloudfront.net/logos/fca-mountain-on-white.png',
    telephone: config.phone,
    email: config.email,
    sameAs: [config.linkedIn],
    address: config.locations.map((loc) => ({
      '@type': 'PostalAddress',
      addressLocality: loc.city,
      addressRegion: loc.state,
      addressCountry: 'US',
    })),
    areaServed: {
      '@type': 'Country',
      name: 'United States',
    },
    serviceType: config.serviceTypes,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(organizationSchema),
        }}
      />
      <PageViewTracker />
      <Header />
      <main>{children}</main>
      <Footer />
    </>
  );
}
