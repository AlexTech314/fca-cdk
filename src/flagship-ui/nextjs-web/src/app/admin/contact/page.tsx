'use client';

import { useEffect, useState } from 'react';
import { AdminPageProvider, useAdminPage } from '@/components/admin/AdminPageContext';
import { SaveBar } from '@/components/admin/SaveBar';
import { EditableField } from '@/components/admin/EditableField';

interface PageData {
  title: string;
  content: string;
  metadata: Record<string, string>;
}

// ============================================
// Inner content (needs AdminPageContext)
// ============================================

function ContactPageContent() {
  const { data, updateField, dirtyFields } = useAdminPage();
  const meta = data.metadata;

  return (
    <div className="bg-background">
      {/* Header */}
      <section className="bg-gradient-to-b from-surface to-surface-blue/30 py-16 md:py-24">
        <div className="container-max">
          <div className="grid gap-8 lg:grid-cols-5 lg:gap-16">
            <div className="lg:col-span-3">
              <EditableField
                fieldKey="title"
                value={data.title}
                onChange={updateField}
                as="h1"
                className="mb-4 text-3xl font-bold text-primary md:text-4xl"
                isDirty={dirtyFields.has('title')}
                placeholder="Page title..."
              />
              <EditableField
                fieldKey="description"
                value={meta.description || ''}
                onChange={updateField}
                as="p"
                className="text-lg text-text-muted"
                isDirty={dirtyFields.has('description')}
                placeholder="Page description..."
              />
            </div>
          </div>

          {/* Content preview */}
          <div className="mt-10 grid gap-8 lg:grid-cols-5 lg:gap-16 lg:items-stretch">
            {/* Left: Form preview (read-only) */}
            <div className="lg:col-span-3">
              <div className="rounded-xl border border-border bg-white p-6 shadow-sm">
                <p className="mb-4 text-sm font-medium text-gray-400 uppercase tracking-wider">Contact Form Preview</p>
                <div className="grid gap-4 sm:grid-cols-2 pointer-events-none opacity-60">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">First Name</label>
                    <div className="rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-400">John</div>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Last Name</label>
                    <div className="rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-400">Doe</div>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
                    <div className="rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-400">john@example.com</div>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Phone</label>
                    <div className="rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-400">(555) 123-4567</div>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-sm font-medium text-gray-700">Company Name</label>
                    <div className="rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-400">Acme Corp</div>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-sm font-medium text-gray-700">Message</label>
                    <div className="h-24 rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-400">I&apos;m interested in learning more...</div>
                  </div>
                  <div className="sm:col-span-2">
                    <div className="rounded-lg bg-gray-300 px-6 py-3 text-center text-sm font-semibold text-white">
                      Send Message
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Sidebar cards preview (read-only) */}
            <div className="lg:col-span-2 flex flex-col justify-between gap-4">
              {/* Resources card */}
              <div className="rounded-xl border border-border bg-white p-6 shadow-sm opacity-60">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary/10 to-secondary/10">
                  <svg className="h-5 w-5 text-secondary" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                  </svg>
                </div>
                <h3 className="mb-2 text-lg font-semibold text-primary">Resources</h3>
                <p className="text-sm text-text-muted">Auto-populated from latest resource article</p>
              </div>

              {/* News card */}
              <div className="rounded-xl border border-border bg-white p-6 shadow-sm opacity-60">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary/10 to-secondary/10">
                  <svg className="h-5 w-5 text-secondary" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V18a2.25 2.25 0 002.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5M6 7.5h3v3H6v-3z" />
                  </svg>
                </div>
                <h3 className="mb-2 text-lg font-semibold text-primary">Latest News</h3>
                <p className="text-sm text-text-muted">Auto-populated from latest news article</p>
              </div>

              {/* Transactions card */}
              <div className="rounded-xl border border-border bg-white p-6 shadow-sm opacity-60">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary/10 to-secondary/10">
                  <svg className="h-5 w-5 text-secondary" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                  </svg>
                </div>
                <h3 className="mb-2 text-lg font-semibold text-primary">Our Track Record</h3>
                <p className="text-sm text-text-muted">Links to /transactions (static)</p>
              </div>
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

export default function AdminContactPage() {
  const [pageData, setPageData] = useState<PageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const pageRes = await fetch('/api/admin/pages/contact');
        if (!pageRes.ok) throw new Error('Failed to fetch page data');

        const page = await pageRes.json();

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
    <AdminPageProvider pageKey="contact" initialData={pageData}>
      <ContactPageContent />
      <SaveBar />
    </AdminPageProvider>
  );
}
