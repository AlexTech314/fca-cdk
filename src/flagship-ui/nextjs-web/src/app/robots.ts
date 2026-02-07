import { MetadataRoute } from 'next';
import { fetchSiteConfig } from '@/lib/utils';

export default async function robots(): Promise<MetadataRoute.Robots> {
  const config = await fetchSiteConfig();
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/private/'],
      },
    ],
    sitemap: `${config.url}/sitemap.xml`,
  };
}
