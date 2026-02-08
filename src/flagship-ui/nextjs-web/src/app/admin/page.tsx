'use client';

import { useEffect, useState } from 'react';
import { AdminPageProvider } from '@/components/admin/AdminPageContext';
import { SaveBar } from '@/components/admin/SaveBar';
import { EditableHero } from '@/components/admin/sections/EditableHero';
import { EditableAwardsBar } from '@/components/admin/sections/EditableAwardsBar';
import { EditableServicesGrid } from '@/components/admin/sections/EditableServicesGrid';
import { EditableTransactionGrid } from '@/components/admin/sections/EditableTransactionGrid';
import { EditableCTASection } from '@/components/admin/sections/EditableCTASection';
import { toAssetUrl } from '@/lib/utils';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

interface PageData {
  title: string;
  metadata: Record<string, string>;
}

interface Tombstone {
  slug: string;
  seller: string;
  imagePath?: string;
}

interface ServiceOffering {
  id: string;
  title: string;
  category: string;
}

interface Award {
  id: string;
  name: string;
  image: string;
}

interface SiteConfig {
  tagline?: string;
}

export default function AdminHomePage() {
  const [pageData, setPageData] = useState<PageData | null>(null);
  const [tombstones, setTombstones] = useState<Tombstone[]>([]);
  const [buySideServices, setBuySideServices] = useState<ServiceOffering[]>([]);
  const [sellSideServices, setSellSideServices] = useState<ServiceOffering[]>(
    []
  );
  const [strategicServices, setStrategicServices] = useState<
    ServiceOffering[]
  >([]);
  const [awards, setAwards] = useState<Award[]>([]);
  const [siteConfig, setSiteConfig] = useState<SiteConfig>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [
          pageRes,
          tombstonesRes,
          buySideRes,
          sellSideRes,
          strategicRes,
          awardsRes,
          configRes,
        ] = await Promise.all([
          fetch('/api/admin/pages/home'),
          fetch(`${API_URL}/tombstones?limit=50`),
          fetch(
            `${API_URL}/service-offerings?category=buy-side&type=service`
          ),
          fetch(
            `${API_URL}/service-offerings?category=sell-side&type=service`
          ),
          fetch(
            `${API_URL}/service-offerings?category=strategic&type=service`
          ),
          fetch(`${API_URL}/awards`),
          fetch(`${API_URL}/site-config`),
        ]);

        if (!pageRes.ok) throw new Error('Failed to fetch page data');

        const page = await pageRes.json();
        const tombstonesData = tombstonesRes.ok
          ? await tombstonesRes.json()
          : { items: [] };
        const buySide = buySideRes.ok ? await buySideRes.json() : [];
        const sellSide = sellSideRes.ok ? await sellSideRes.json() : [];
        const strategic = strategicRes.ok ? await strategicRes.json() : [];
        const awardsData = awardsRes.ok ? await awardsRes.json() : [];
        const config = configRes.ok ? await configRes.json() : {};

        // Transform metadata to ensure all values are strings
        const metadata: Record<string, string> = {};
        if (page.metadata) {
          for (const [key, value] of Object.entries(page.metadata)) {
            metadata[key] = String(value ?? '');
          }
        }

        setPageData({
          title: page.title || '',
          metadata,
        });

        // Transform tombstones - resolve image paths
        const items = tombstonesData.items || tombstonesData;
        setTombstones(
          (Array.isArray(items) ? items : []).map(
            (t: { slug: string; name?: string; asset?: { s3Key: string } | null }) => ({
              slug: t.slug,
              seller: t.name || t.slug,
              imagePath: t.asset?.s3Key ? toAssetUrl(t.asset.s3Key) : undefined,
            })
          )
        );

        setBuySideServices(buySide);
        setSellSideServices(sellSide);
        setStrategicServices(strategic);
        setAwards(awardsData);
        setSiteConfig(config);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <svg
            className="mx-auto h-8 w-8 animate-spin text-primary"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <p className="mt-4 text-sm text-text-muted">
            Loading page editor...
          </p>
        </div>
      </div>
    );
  }

  if (error || !pageData) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-semibold text-red-600">
            Failed to load page data
          </p>
          <p className="mt-2 text-sm text-text-muted">{error}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <AdminPageProvider pageKey="home" initialData={pageData}>
      {/* Page preview with editable sections */}
      <div className="bg-background">
        <EditableHero tagline={siteConfig.tagline} />

        <EditableAwardsBar initialAwards={awards} />

        <EditableServicesGrid
          initialBuySide={buySideServices}
          initialSellSide={sellSideServices}
          initialStrategic={strategicServices}
        />

        <EditableTransactionGrid tombstones={tombstones} limit={10} />

        <EditableCTASection />
      </div>

      <SaveBar />
    </AdminPageProvider>
  );
}
