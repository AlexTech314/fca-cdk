import { MetadataRoute } from 'next';
import { getNewsArticles, getResourceArticles } from '@/lib/data';
import { siteConfig } from '@/lib/utils';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = siteConfig.url;

  // Static pages
  const staticPages = [
    '',
    '/about',
    '/team',
    '/transactions',
    '/news',
    '/resources',
    '/faq',
    '/contact',
    '/buy-side',
  ];

  const staticRoutes = staticPages.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: route === '' ? 1 : 0.8,
  }));

  // Dynamic news pages
  const newsArticles = await getNewsArticles();
  const newsRoutes = newsArticles.map((article) => ({
    url: `${baseUrl}/news/${article.slug}`,
    lastModified: new Date(),
    changeFrequency: 'yearly' as const,
    priority: 0.6,
  }));

  // Dynamic resource pages
  const resourceArticles = await getResourceArticles();
  const resourceRoutes = resourceArticles.map((article) => ({
    url: `${baseUrl}/resources/${article.slug}`,
    lastModified: new Date(),
    changeFrequency: 'yearly' as const,
    priority: 0.7,
  }));

  return [...staticRoutes, ...newsRoutes, ...resourceRoutes];
}
