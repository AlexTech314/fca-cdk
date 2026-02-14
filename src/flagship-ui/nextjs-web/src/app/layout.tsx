import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { fetchSiteConfig } from '@/lib/utils';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export async function generateMetadata(): Promise<Metadata> {
  const config = await fetchSiteConfig();

  return {
    metadataBase: new URL(config.url),
    title: {
      default: `${config.name} | Middle Market M&A Investment Bank`,
      template: `%s | ${config.name}`,
    },
    description: config.description,
    icons: {
      icon: [
        {
          url: '/meta/favicon-light.ico',
          media: '(prefers-color-scheme: light)',
        },
        {
          url: '/meta/favicon-dark.ico',
          media: '(prefers-color-scheme: dark)',
        },
      ],
      apple: '/meta/favicon-light.ico',
    },
    keywords: [
      'M&A advisory',
      'mergers and acquisitions',
      'investment banking',
      'middle market',
      'lower middle market',
      'sell-side advisory',
      'buy-side advisory',
      'private equity',
      'business sale',
      'exit planning',
    ],
    authors: [{ name: config.name }],
    creator: config.name,
    publisher: config.name,
    openGraph: {
      type: 'website',
      locale: 'en_US',
      url: config.url,
      siteName: config.name,
      title: `${config.name} | Middle Market M&A Investment Bank`,
      description: config.description,
      images: [
        {
          url: config.ogImage,
          width: 1200,
          height: 630,
          alt: config.name,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${config.name} | Middle Market M&A Investment Bank`,
      description: config.description,
      images: [config.ogImage],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    verification: {
      // Add verification codes when available
      // google: 'verification-code',
    },
  };
}

// When NEXT_PUBLIC_DEFAULT_ROUTE is /admin (admin container), skip
// the public Header/Footer and SEO schema — admin has its own shell.
const isAdminOnly = process.env.NEXT_PUBLIC_DEFAULT_ROUTE === '/admin';

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  if (isAdminOnly) {
    return (
      <html lang="en" className={inter.variable}>
        <body className="min-h-screen font-sans antialiased">
          {children}
        </body>
      </html>
    );
  }

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
    <html lang="en" className={inter.variable}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationSchema),
          }}
        />
      </head>
      <body className="min-h-screen bg-background font-sans antialiased">
        <Header />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
