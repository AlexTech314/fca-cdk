import { MetadataRoute } from 'next';
import {
  getTombstones,
  getTombstoneFilterOptions,
  getAllNewsIndustries,
  getNewsArticles,
  getResourceArticles,
  cityToSlug,
} from '@/lib/data';
import { fetchSiteConfig } from '@/lib/utils';

/**
 * Parse a date string or year into a Date object
 */
function parseDate(dateStr: string | undefined, fallbackYear?: number): Date {
  if (dateStr) {
    const parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }
  }
  // Use fallback year if provided, otherwise current date
  if (fallbackYear) {
    return new Date(fallbackYear, 0, 1); // Jan 1 of that year
  }
  return new Date();
}

/**
 * Get the most recent modification date from a list of dates
 */
function getMostRecentDate(dates: Date[]): Date {
  if (dates.length === 0) return new Date();
  return dates.reduce((latest, current) => 
    current > latest ? current : latest
  );
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const config = await fetchSiteConfig();
  const baseUrl = config.url;
  const now = new Date();

  // Static pages - use a reasonable static date for content that rarely changes
  const staticPages = [
    { route: '', priority: 1 },
    { route: '/about', priority: 0.8 },
    { route: '/team', priority: 0.8 },
    { route: '/transactions', priority: 0.9 },
    { route: '/news', priority: 0.9 },
    { route: '/resources', priority: 0.8 },
    { route: '/faq', priority: 0.7 },
    { route: '/contact', priority: 0.8 },
    { route: '/sell-side', priority: 0.8 },
    { route: '/buy-side', priority: 0.8 },
    { route: '/privacy-policy', priority: 0.3 },
  ];

  const staticRoutes = staticPages.map(({ route, priority }) => ({
    url: `${baseUrl}${route}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority,
  }));

  // Individual transaction pages - use transaction year as lastModified
  const [tombstones, filters] = await Promise.all([
    getTombstones(),
    getTombstoneFilterOptions(),
  ]);
  const transactionRoutes = tombstones.map((t) => ({
    url: `${baseUrl}/transactions/${t.slug}`,
    lastModified: parseDate(undefined, t.transactionYear),
    changeFrequency: 'yearly' as const,
    priority: 0.7,
  }));

  // Transaction grouping routes - by industry
  const industryRoutes = await Promise.all(filters.industries.map(async (ind) => {
    const slug = ind.slug;
    const indTombstones = tombstones.filter(t => t.industries.some(i => i.slug === slug));
    const latestYear = Math.max(...indTombstones.map(t => t.transactionYear || 0));
    return {
      url: `${baseUrl}/transactions/industry/${slug}`,
      lastModified: latestYear ? new Date(latestYear, 11, 31) : now,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    };
  }));

  // Transaction grouping routes - by state
  const stateRoutes = filters.states.map((state) => {
    const stateTombstones = tombstones.filter(t =>
      t.locationStates.some(s => s.id.toUpperCase() === state.id.toUpperCase())
    );
    const latestYear = Math.max(0, ...stateTombstones.map(t => t.transactionYear || 0));
    return {
      url: `${baseUrl}/transactions/state/${state.id.toLowerCase()}`,
      lastModified: latestYear ? new Date(latestYear, 11, 31) : now,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    };
  });

  // Transaction grouping routes - by city
  const cityRoutes = filters.cities.map((city) => {
    const cityTombstones = tombstones.filter(t =>
      t.locationCities.some(c => c.id === city.id)
    );
    const latestYear = Math.max(0, ...cityTombstones.map(t => t.transactionYear || 0));
    return {
      url: `${baseUrl}/transactions/city/${cityToSlug(city.name)}`,
      lastModified: latestYear ? new Date(latestYear, 11, 31) : now,
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    };
  });

  // Transaction grouping routes - by year
  const yearRoutes = filters.years.map((year) => ({
    url: `${baseUrl}/transactions/year/${year}`,
    lastModified: new Date(year, 11, 31), // Dec 31 of that year
    changeFrequency: 'yearly' as const,
    priority: 0.5,
  }));

  // Dynamic news pages - use article date as lastModified
  const newsArticles = await getNewsArticles();
  const newsRoutes = newsArticles.map((article) => ({
    url: `${baseUrl}/news/${article.slug}`,
    lastModified: parseDate(article.date),
    changeFrequency: 'yearly' as const,
    priority: 0.6,
  }));

  // News grouping routes - by industry
  const newsIndustries = await getAllNewsIndustries();
  const newsIndustryRoutes = newsIndustries.map((ind) => {
    const slug = ind.slug;
    const indArticles = newsArticles.filter(a => a.industries.some(i => i.slug === slug));
    const dates = indArticles.map(a => parseDate(a.date));
    return {
      url: `${baseUrl}/news/industry/${slug}`,
      lastModified: getMostRecentDate(dates),
      changeFrequency: 'weekly' as const,
      priority: 0.5,
    };
  });

  // Dynamic resource pages (resources don't have dates, use static date)
  const resourceArticles = await getResourceArticles();
  const resourceRoutes = resourceArticles.map((article) => ({
    url: `${baseUrl}/resources/${article.slug}`,
    lastModified: now,
    changeFrequency: 'yearly' as const,
    priority: 0.7,
  }));

  return [
    ...staticRoutes,
    ...transactionRoutes,
    ...industryRoutes,
    ...stateRoutes,
    ...cityRoutes,
    ...yearRoutes,
    ...newsRoutes,
    ...newsIndustryRoutes,
    ...resourceRoutes,
  ];
}
