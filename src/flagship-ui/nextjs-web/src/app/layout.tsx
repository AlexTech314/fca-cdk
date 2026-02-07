import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { siteConfig } from '@/lib/utils';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteConfig.name} | Middle Market M&A Investment Bank`,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  icons: {
    icon: [
      {
        url: '/favicon-light.ico',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/favicon-dark.ico',
        media: '(prefers-color-scheme: dark)',
      },
    ],
    apple: '/favicon-light.ico',
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
  authors: [{ name: siteConfig.name }],
  creator: siteConfig.name,
  publisher: siteConfig.name,
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: siteConfig.url,
    siteName: siteConfig.name,
    title: `${siteConfig.name} | Middle Market M&A Investment Bank`,
    description: siteConfig.description,
    images: [
      {
        url: siteConfig.ogImage,
        width: 1200,
        height: 630,
        alt: siteConfig.name,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${siteConfig.name} | Middle Market M&A Investment Bank`,
    description: siteConfig.description,
    images: [siteConfig.ogImage],
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

// JSON-LD Organization Schema
const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'FinancialService',
  name: siteConfig.name,
  description: siteConfig.description,
  url: siteConfig.url,
  logo: `${siteConfig.url}/logo.png`,
  telephone: siteConfig.phone,
  email: siteConfig.email,
  sameAs: [siteConfig.linkedIn],
  address: siteConfig.locations.map((loc) => ({
    '@type': 'PostalAddress',
    addressLocality: loc.city,
    addressRegion: loc.state,
    addressCountry: 'US',
  })),
  areaServed: {
    '@type': 'Country',
    name: 'United States',
  },
  serviceType: [
    'Mergers and Acquisitions Advisory',
    'Sell-Side Advisory',
    'Buy-Side Advisory',
    'Strategic Consulting',
    'Investment Banking',
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
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
