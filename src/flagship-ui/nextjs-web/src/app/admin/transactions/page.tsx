'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { AdminPageProvider, useAdminPage } from '@/components/admin/AdminPageContext';
import { SaveBar } from '@/components/admin/SaveBar';
import { EditableField } from '@/components/admin/EditableField';
import { TransactionsTable } from '@/components/admin/sections/TransactionsTable';
import { useUnsavedChanges } from '@/components/admin/UnsavedChangesContext';
import { toAssetUrl } from '@/lib/utils';
import { authedApiFetch } from '@/lib/admin/admin-fetch';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

interface PageData {
  title: string;
  content: string;
  metadata: Record<string, string>;
}

interface Tombstone {
  id: string;
  name: string;
  slug: string;
  assetId: string | null;
  asset?: { id: string; s3Key: string; fileName: string; fileType: string } | null;
  industry: string | null;
  role: string | null;
  buyerPeFirm: string | null;
  buyerPlatform: string | null;
  transactionYear: number | null;
  city: string | null;
  state: string | null;
  isPublished: boolean;
  tags: { id: string; name: string; slug: string }[];
}

type ViewMode = 'grid' | 'table';

// ============================================
// Grid preview (read-only, links to detail)
// ============================================

function TransactionGridPreview({ tombstones }: { tombstones: Tombstone[] }) {
  const { requestNavigation } = useUnsavedChanges();

  const withImages = tombstones.filter((t) => t.asset?.s3Key);

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {withImages.map((t) => {
        const imageUrl = t.asset?.s3Key ? toAssetUrl(t.asset.s3Key) : null;
        return (
          <button
            key={t.id}
            onClick={() => requestNavigation(`/admin/transactions/${t.slug}`)}
            className="group relative overflow-hidden rounded-lg border border-border bg-white shadow-sm transition-all hover:border-secondary/30 hover:shadow-lg"
          >
            <div className="relative" style={{ aspectRatio: '391/450' }}>
              {imageUrl ? (
                <Image src={imageUrl} alt={t.name} fill className="object-cover" sizes="(max-width: 640px) 50vw, 20vw" />
              ) : (
                <div className="flex h-full items-center justify-center bg-gray-100 p-2 text-center text-xs text-gray-400">
                  {t.name}
                </div>
              )}
            </div>
            {!t.isPublished && (
              <div className="absolute left-1 top-1 rounded bg-red-500/90 px-1.5 py-0.5 text-[8px] font-medium text-white">Draft</div>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ============================================
// Inner content (needs AdminPageContext)
// ============================================

function TransactionsPageContent({ tombstones }: { tombstones: Tombstone[] }) {
  const { data, updateField, dirtyFields } = useAdminPage();
  const meta = data.metadata;
  const [viewMode, setViewMode] = useState<ViewMode>('table');

  return (
    <div className="bg-background">
      {/* Hero */}
      <section className="bg-gradient-to-b from-primary to-primary-dark py-16 text-center text-white">
        <div className="container-max">
          <EditableField
            fieldKey="subtitle"
            value={meta.subtitle || ''}
            onChange={updateField}
            as="p"
            className="mb-2 text-sm font-semibold uppercase tracking-wider text-white/60"
            isDirty={dirtyFields.has('subtitle')}
            placeholder="Subtitle..."
          />
          <EditableField
            fieldKey="title"
            value={data.title}
            onChange={updateField}
            as="h1"
            className="text-3xl font-bold md:text-4xl"
            isDirty={dirtyFields.has('title')}
            placeholder="Page title..."
          />
          <EditableField
            fieldKey="description"
            value={meta.description || ''}
            onChange={updateField}
            as="p"
            className="mx-auto mt-4 max-w-2xl text-lg text-white/80"
            isDirty={dirtyFields.has('description')}
            placeholder="Description..."
          />
        </div>
      </section>

      {/* View toggle + content */}
      <section className="py-12 md:py-16">
        <div className="container-max">
          {/* Section heading + view toggle */}
          <div className="mb-8 flex items-center justify-between">
            <div>
              <EditableField
                fieldKey="sectionSubtitle"
                value={meta.sectionSubtitle || ''}
                onChange={updateField}
                as="p"
                className="mb-1 text-sm font-semibold uppercase tracking-wider text-secondary"
                isDirty={dirtyFields.has('sectionSubtitle')}
                placeholder="Section subtitle..."
              />
              <EditableField
                fieldKey="sectionDescription"
                value={meta.sectionDescription || ''}
                onChange={updateField}
                as="p"
                className="text-text-muted"
                isDirty={dirtyFields.has('sectionDescription')}
                placeholder="Section description..."
              />
            </div>

            {/* Toggle */}
            <div className="flex rounded-lg border border-border bg-white p-0.5 shadow-sm">
              <button
                onClick={() => setViewMode('grid')}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-primary text-white'
                    : 'text-text-muted hover:text-text'
                }`}
              >
                <svg className="mr-1.5 inline h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25a2.25 2.25 0 0 1-2.25-2.25v-2.25Z" />
                </svg>
                Grid
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  viewMode === 'table'
                    ? 'bg-primary text-white'
                    : 'text-text-muted hover:text-text'
                }`}
              >
                <svg className="mr-1.5 inline h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 0 1-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0 1 12 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25m-17.25 0h7.5c.621 0 1.125.504 1.125 1.125M3.375 8.25c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m17.25-3.75h-7.5c-.621 0-1.125.504-1.125 1.125m8.625-1.125c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M12 10.875v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125M13.125 12h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125M20.625 12c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5M12 14.625v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 14.625c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125m0 0v1.5c0 .621-.504 1.125-1.125 1.125m0 0h-7.5" />
                </svg>
                Table
              </button>
            </div>
          </div>

          {/* Content */}
          {viewMode === 'grid' ? (
            <TransactionGridPreview tombstones={tombstones} />
          ) : (
            <TransactionsTable initialTombstones={tombstones} />
          )}
        </div>
      </section>

      {/* CTA */}
      <section
        className="py-16 md:py-20"
        style={{
          background: 'linear-gradient(135deg, #0f2744 0%, #1e3a5f 50%, #0f2744 100%)',
        }}
      >
        <div className="container-max">
          <div className="mx-auto max-w-3xl text-center">
            <EditableField
              fieldKey="ctaTitle"
              value={meta.ctaTitle || ''}
              onChange={updateField}
              as="h2"
              className="text-3xl font-bold md:text-4xl"
              style={{ color: '#ffffff' }}
              isDirty={dirtyFields.has('ctaTitle')}
              placeholder="CTA title..."
            />
            <EditableField
              fieldKey="ctaDescription"
              value={meta.ctaDescription || ''}
              onChange={updateField}
              as="p"
              className="mt-4 text-lg"
              style={{ color: 'rgba(255, 255, 255, 0.85)' }}
              isDirty={dirtyFields.has('ctaDescription')}
              placeholder="CTA description..."
            />
            <div className="mt-8">
              <span
                className="inline-flex items-center justify-center rounded-md border-2 px-6 py-3 text-base font-semibold"
                style={{ borderColor: '#ffffff', backgroundColor: 'rgba(255, 255, 255, 0.1)', color: '#ffffff' }}
              >
                <EditableField
                  fieldKey="ctaText"
                  value={meta.ctaText || ''}
                  onChange={updateField}
                  as="span"
                  isDirty={dirtyFields.has('ctaText')}
                  placeholder="CTA button text..."
                />
              </span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

// ============================================
// Main page
// ============================================

export default function AdminTransactionsPage() {
  const [pageData, setPageData] = useState<PageData | null>(null);
  const [tombstones, setTombstones] = useState<Tombstone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [pageRes, tombRes] = await Promise.all([
          authedApiFetch('/api/admin/pages/transactions'),
          fetch(`${API_URL}/tombstones?limit=200`),
        ]);

        if (!pageRes.ok) throw new Error('Failed to fetch page data');

        const page = await pageRes.json();
        const tombData = tombRes.ok ? await tombRes.json() : { items: [] };

        const metadata: Record<string, string> = {};
        if (page.metadata) {
          for (const [key, value] of Object.entries(page.metadata)) {
            metadata[key] = String(value ?? '');
          }
        }

        setPageData({ title: page.title || '', content: page.content || '', metadata });
        setTombstones(tombData.items || tombData);
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
          <svg className="mx-auto h-8 w-8 animate-spin text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="mt-4 text-sm text-text-muted">Loading page editor...</p>
        </div>
      </div>
    );
  }

  if (error || !pageData) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-semibold text-red-600">Failed to load page data</p>
          <p className="mt-2 text-sm text-text-muted">{error}</p>
          <button type="button" onClick={() => window.location.reload()} className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white">Retry</button>
        </div>
      </div>
    );
  }

  return (
    <AdminPageProvider pageKey="transactions" initialData={pageData}>
      <TransactionsPageContent tombstones={tombstones} />
      <SaveBar />
    </AdminPageProvider>
  );
}
