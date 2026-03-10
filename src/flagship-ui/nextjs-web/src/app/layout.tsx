import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { fetchSiteConfig } from '@/lib/utils';

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-background font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
