'use client';

import { useState } from 'react';
import Link from 'next/link';
import { stateNames } from '@/lib/seo';

/**
 * Convert city name to URL-friendly slug (client-safe version)
 */
function cityToSlug(city: string): string {
  return city
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

interface ContentExplorerProps {
  type: 'transactions' | 'news';
  tags: string[];
  states?: string[];
  cities?: string[];
  years?: number[];
  /** Map of tag slug -> display name, provided by server component */
  tagNames?: Record<string, string>;
}

type TabType = 'industry' | 'state' | 'city' | 'year';

const TAB_CONFIG = {
  industry: {
    label: 'By Industry',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
      </svg>
    ),
  },
  state: {
    label: 'By State',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
      </svg>
    ),
  },
  city: {
    label: 'By City',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z" />
      </svg>
    ),
  },
  year: {
    label: 'By Year',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
      </svg>
    ),
  },
};

/**
 * Format tag slug for display (capitalize words) - client-safe fallback
 */
function formatTagSlug(slug: string): string {
  return slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

export function ContentExplorer({
  type,
  tags,
  states = [],
  cities = [],
  years = [],
  tagNames = {},
}: ContentExplorerProps) {
  const [activeTab, setActiveTab] = useState<TabType>('industry');

  // For news, we only show industry tags
  const availableTabs: TabType[] = type === 'transactions' 
    ? ['industry', 'state', 'city', 'year']
    : ['industry'];

  const basePath = type === 'transactions' ? '/transactions' : '/news';

  const linkClass = "shrink-0 rounded-lg border border-secondary/20 bg-white px-4 py-2 text-sm font-medium text-primary shadow-sm transition-all hover:border-secondary hover:bg-secondary hover:text-white hover:shadow-md";

  const renderContent = () => {
    switch (activeTab) {
      case 'industry':
        return (
          <>
            {tags.map((tag) => (
              <Link key={tag} href={`${basePath}/tag/${tag}`} className={linkClass}>
                {tagNames[tag] || formatTagSlug(tag)}
              </Link>
            ))}
          </>
        );

      case 'state':
        return (
          <>
            {states.map((state) => (
              <Link key={state} href={`${basePath}/state/${state.toLowerCase()}`} className={linkClass}>
                {stateNames[state.toUpperCase()] || state}
              </Link>
            ))}
          </>
        );

      case 'city':
        return (
          <>
            {cities.map((city) => (
              <Link key={city} href={`${basePath}/city/${cityToSlug(city)}`} className={linkClass}>
                {city}
              </Link>
            ))}
          </>
        );

      case 'year':
        return (
          <>
            {years.map((year) => (
              <Link key={year} href={`${basePath}/year/${year}`} className={linkClass}>
                {year}
              </Link>
            ))}
          </>
        );

      default:
        return null;
    }
  };

  return (
    <div className="rounded-2xl border border-secondary/20 bg-gradient-to-br from-surface-blue/50 to-white p-6 shadow-sm">
      {/* Header */}
      <div className="mb-6 flex flex-col items-center text-center">
        <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/10 to-secondary/10 text-secondary">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-primary">
          Explore {type === 'transactions' ? 'Transactions' : 'News'}
        </h3>
        <p className="text-sm text-text-muted">
          Browse by {type === 'transactions' ? 'industry, location, or year' : 'topic'}
        </p>
      </div>

      {/* Tabs */}
      {availableTabs.length > 1 && (
        <div className="mb-6 flex gap-1 rounded-xl bg-primary/5 p-1">
          {availableTabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
                activeTab === tab
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-text-muted hover:text-text'
              }`}
            >
              {TAB_CONFIG[tab].icon}
              <span className="hidden sm:inline">{TAB_CONFIG[tab].label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Content - horizontal scroll on mobile, wrap on desktop */}
      <div className="overflow-x-auto pb-2 md:overflow-x-visible">
        <div className="flex gap-2 md:flex-wrap md:justify-center">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
