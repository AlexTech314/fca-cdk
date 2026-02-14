'use client';

import { useEffect, useState } from 'react';
import { AdminPageProvider, useAdminPage } from '@/components/admin/AdminPageContext';
import { SaveBar } from '@/components/admin/SaveBar';
import { EditableField } from '@/components/admin/EditableField';
import { EditableFAQList } from '@/components/admin/sections/EditableFAQList';
import { authedApiFetch } from '@/lib/admin/admin-fetch';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

interface PageData {
  title: string;
  content: string;
  metadata: Record<string, string>;
}

interface FAQ {
  id: string;
  question: string;
  answer: string;
  sortOrder: number;
}

// ============================================
// Inner content (needs AdminPageContext)
// ============================================

function FAQPageContent({ faqs }: { faqs: FAQ[] }) {
  const { data, updateField, dirtyFields } = useAdminPage();
  const meta = data.metadata;

  return (
    <div className="bg-background">
      {/* Hero */}
      <section className="bg-gradient-to-b from-primary to-primary-dark py-16 text-center text-white">
        <div className="container-max">
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
            placeholder="Page description..."
          />
        </div>
      </section>

      {/* FAQ List */}
      <section className="py-16 md:py-24">
        <div className="container-max">
          <EditableFAQList initialFaqs={faqs} />
        </div>
      </section>

      {/* CTA */}
      <section
        className="py-16 md:py-20"
        style={{
          background:
            'linear-gradient(135deg, #0f2744 0%, #1e3a5f 50%, #0f2744 100%)',
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
                style={{
                  borderColor: '#ffffff',
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  color: '#ffffff',
                }}
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
// Main page component
// ============================================

export default function AdminFAQPage() {
  const [pageData, setPageData] = useState<PageData | null>(null);
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [pageRes, faqsRes] = await Promise.all([
          authedApiFetch('/api/admin/pages/faq'),
          fetch(`${API_URL}/faqs`),
        ]);

        if (!pageRes.ok) throw new Error('Failed to fetch page data');

        const page = await pageRes.json();
        const faqData: FAQ[] = faqsRes.ok ? await faqsRes.json() : [];

        // Transform metadata values to strings
        const metadata: Record<string, string> = {};
        if (page.metadata) {
          for (const [key, value] of Object.entries(page.metadata)) {
            metadata[key] = String(value ?? '');
          }
        }

        setPageData({
          title: page.title || '',
          content: page.content || '',
          metadata,
        });
        setFaqs(faqData);
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
    <AdminPageProvider pageKey="faq" initialData={pageData}>
      <FAQPageContent faqs={faqs} />
      <SaveBar />
    </AdminPageProvider>
  );
}
