'use client';

import { useEffect, useState } from 'react';
import { AdminPageProvider, useAdminPage } from '@/components/admin/AdminPageContext';
import { SaveBar } from '@/components/admin/SaveBar';
import { EditableField } from '@/components/admin/EditableField';
import { EditableInlineField } from '@/components/admin/EditableInlineField';
import { authedApiFetch } from '@/lib/admin/admin-fetch';

interface PageData {
  title: string;
  content: string;
  metadata: Record<string, string>;
}

// ============================================
// Editable bullet list for service bullets
// ============================================

interface BulletItem {
  id: string;
  text: string;
}

type BulletStatus = 'unchanged' | 'new' | 'modified' | 'deleted';

let bulletIdCounter = 0;
function nextBulletId(): string {
  return `bullet-new-${++bulletIdCounter}`;
}

function parseBullets(value: string): BulletItem[] {
  return value
    .split('\n')
    .filter((s) => s.trim())
    .map((text, i) => ({ id: `bullet-${i}`, text }));
}

function EditableBulletList({
  metaKey,
  value,
  onChange,
}: {
  metaKey: string;
  value: string;
  onChange: (key: string, value: string) => void;
}) {
  const { saveStatus } = useAdminPage();

  const [items, setItems] = useState<BulletItem[]>(() => parseBullets(value));
  const [origItems, setOrigItems] = useState<BulletItem[]>(() => parseBullets(value));
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
  const selfUpdate = { current: false };

  useEffect(() => {
    if (saveStatus === 'success') {
      const parsed = parseBullets(value);
      setItems(parsed);
      setOrigItems(parsed);
      setDeletedIds(new Set());
    }
  }, [saveStatus, value]);

  useEffect(() => {
    if (selfUpdate.current) {
      selfUpdate.current = false;
      return;
    }
    const parsed = parseBullets(value);
    setItems(parsed);
    setOrigItems(parsed);
    setDeletedIds(new Set());
  }, [value]);

  const syncToMeta = (currentItems: BulletItem[], deleted: Set<string>) => {
    const finalValue = currentItems
      .filter((item) => !deleted.has(item.id))
      .map((item) => item.text)
      .filter((t) => t.trim())
      .join('\n');
    selfUpdate.current = true;
    onChange(metaKey, finalValue);
  };

  const getStatus = (item: BulletItem): BulletStatus => {
    if (deletedIds.has(item.id)) return 'deleted';
    if (item.id.startsWith('bullet-new-')) return 'new';
    const orig = origItems.find((o) => o.id === item.id);
    if (orig && orig.text !== item.text) return 'modified';
    return 'unchanged';
  };

  const updateItemText = (id: string, text: string) => {
    const updated = items.map((item) =>
      item.id === id ? { ...item, text } : item
    );
    setItems(updated);
    syncToMeta(updated, deletedIds);
  };

  const handleDelete = (id: string) => {
    if (id.startsWith('bullet-new-')) {
      const updated = items.filter((item) => item.id !== id);
      setItems(updated);
      syncToMeta(updated, deletedIds);
    } else {
      const newDeleted = new Set(deletedIds);
      newDeleted.add(id);
      setDeletedIds(newDeleted);
      syncToMeta(items, newDeleted);
    }
  };

  const handleUndoDelete = (id: string) => {
    const newDeleted = new Set(deletedIds);
    newDeleted.delete(id);
    setDeletedIds(newDeleted);
    syncToMeta(items, newDeleted);
  };

  const handleAdd = () => {
    const newItem: BulletItem = { id: nextBulletId(), text: '' };
    const updated = [...items, newItem];
    setItems(updated);
  };

  return (
    <>
      <ul className="space-y-1">
        {items.map((item) => {
          const status = getStatus(item);
          const isDeleted = status === 'deleted';
          const orig = origItems.find((o) => o.id === item.id);

          return (
            <li key={item.id} className="group/item relative">
              <div className={`flex items-center gap-2 rounded px-1 py-0.5 transition-all ${
                status === 'new' || status === 'modified'
                  ? 'border border-dashed border-amber-400 bg-amber-50/50'
                  : isDeleted
                    ? 'border border-red-300 bg-red-50/50 opacity-60'
                    : ''
              }`}>
                <span className={`mt-0.5 h-1.5 w-1.5 flex-shrink-0 rounded-full ${isDeleted ? 'bg-red-400' : 'bg-secondary'}`} />

                <EditableInlineField
                  value={item.text}
                  onChangeValue={(v) => updateItemText(item.id, v)}
                  originalValue={orig?.text}
                  as="span"
                  className="flex-1 text-sm text-text-muted"
                  placeholder="Service item..."
                  disabled={isDeleted}
                />

                {isDeleted ? (
                  <button
                    onClick={() => handleUndoDelete(item.id)}
                    className="shrink-0 text-[10px] font-medium text-red-500 hover:text-red-700"
                  >
                    Undo
                  </button>
                ) : (
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="shrink-0 rounded p-0.5 text-gray-300 opacity-0 transition-opacity hover:text-red-500 group-hover/item:opacity-100"
                    title="Remove"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>

              {status === 'new' && <p className="ml-4 text-[9px] font-medium text-amber-600">New</p>}
              {status === 'modified' && <p className="ml-4 text-[9px] font-medium text-amber-600">Modified</p>}
              {status === 'deleted' && <p className="ml-4 text-[9px] font-medium text-red-500">Will be removed on save</p>}
            </li>
          );
        })}
      </ul>
      <button
        onClick={handleAdd}
        className="mt-3 flex items-center gap-1 text-xs font-medium text-gray-400 transition-colors hover:text-blue-500"
      >
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        Add service
      </button>
    </>
  );
}

// ============================================
// Inner content (needs AdminPageContext)
// ============================================

function BuySidePageContent() {
  const { data, updateField, dirtyFields, saveStatus } = useAdminPage();
  const meta = data.metadata;

  // Split content at --- to separate intro from acquisition search detail
  const contentSections = (data.content || '').split('---').map((s) => s.trim()).filter(Boolean);
  const introParagraphs = contentSections[0]?.split('\n\n').filter((p: string) => p.trim()) || [];
  const searchDetailParagraphs = contentSections[1]?.split('\n\n').filter((p: string) => p.trim()) || [];

  // Track original content for dirty detection
  const [origContent, setOrigContent] = useState(data.content || '');
  useEffect(() => {
    if (saveStatus === 'success') {
      setOrigContent(data.content || '');
    }
  }, [saveStatus, data.content]);

  const origSections = origContent.split('---').map((s) => s.trim()).filter(Boolean);
  const origIntroParagraphs = origSections[0]?.split('\n\n').filter((p: string) => p.trim()) || [];
  const origSearchParagraphs = origSections[1]?.split('\n\n').filter((p: string) => p.trim()) || [];

  const isIntroParagraphDirty = (index: number): boolean => {
    if (index >= origIntroParagraphs.length) return true;
    return introParagraphs[index] !== origIntroParagraphs[index];
  };

  const isSearchParagraphDirty = (index: number): boolean => {
    if (index >= origSearchParagraphs.length) return true;
    return searchDetailParagraphs[index] !== origSearchParagraphs[index];
  };

  const rebuildContent = (introParas: string[], searchParas: string[]) => {
    const intro = introParas.join('\n\n');
    const search = searchParas.join('\n\n');
    if (search) {
      updateField('content', `${intro}\n\n---\n\n${search}`);
    } else {
      updateField('content', intro);
    }
  };

  const handleIntroParagraphChange = (_key: string, value: string, index: number) => {
    const updated = [...introParagraphs];
    updated[index] = value;
    rebuildContent(updated, searchDetailParagraphs);
  };

  const handleSearchParagraphChange = (_key: string, value: string, index: number) => {
    const updated = [...searchDetailParagraphs];
    updated[index] = value;
    rebuildContent(introParagraphs, updated);
  };

  return (
    <div className="bg-background">
      {/* Hero */}
      <section
        className="py-16 md:py-20"
        style={{ background: 'linear-gradient(135deg, #0f2744 0%, #1e3a5f 50%, #0f2744 100%)' }}
      >
        <div className="container-max text-center">
          <EditableField
            fieldKey="title"
            value={data.title}
            onChange={updateField}
            as="h1"
            className="text-3xl font-bold md:text-4xl lg:text-5xl"
            style={{ color: '#ffffff' }}
            isDirty={dirtyFields.has('title')}
            placeholder="Page title..."
          />
          <EditableField
            fieldKey="subtitle"
            value={meta.subtitle || ''}
            onChange={updateField}
            as="p"
            className="mx-auto mt-2 text-sm font-semibold uppercase tracking-wider"
            style={{ color: 'rgba(255, 255, 255, 0.7)' }}
            isDirty={dirtyFields.has('subtitle')}
            placeholder="Subtitle..."
          />
          <EditableField
            fieldKey="description"
            value={meta.description || ''}
            onChange={updateField}
            as="p"
            className="mx-auto mt-4 max-w-2xl text-lg"
            style={{ color: 'rgba(255, 255, 255, 0.85)' }}
            isDirty={dirtyFields.has('description')}
            placeholder="Hero description..."
          />
        </div>
      </section>

      {/* Introduction */}
      <section className="py-16 md:py-24">
        <div className="container-max">
          <div className="mx-auto max-w-3xl">
            <p className="mb-4 text-[10px] font-semibold uppercase tracking-widest text-gray-400">Introduction</p>
            <div className="space-y-4 text-lg text-text-muted">
              {introParagraphs.map((p: string, i: number) => (
                <EditableField
                  key={`intro-${i}`}
                  fieldKey={`intro-para-${i}`}
                  value={p}
                  onChange={(_key, value) => handleIntroParagraphChange(_key, value, i)}
                  as="p"
                  className=""
                  isDirty={isIntroParagraphDirty(i)}
                  placeholder="Paragraph text..."
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Acquisition Search */}
      <section className="bg-surface py-16 md:py-24">
        <div className="container-max">
          <div className="mx-auto max-w-3xl">
            <p className="mb-4 text-[10px] font-semibold uppercase tracking-widest text-gray-400">Acquisition Search Section</p>
            <EditableField
              fieldKey="searchHeading"
              value={meta.searchHeading || ''}
              onChange={updateField}
              as="h2"
              className="mb-6 text-2xl font-bold text-text md:text-3xl"
              isDirty={dirtyFields.has('searchHeading')}
              placeholder="Section heading..."
            />
            <div className="space-y-4 text-lg text-text-muted">
              {searchDetailParagraphs.map((p: string, i: number) => (
                <EditableField
                  key={`search-${i}`}
                  fieldKey={`search-para-${i}`}
                  value={p}
                  onChange={(_key, value) => handleSearchParagraphChange(_key, value, i)}
                  as="p"
                  className=""
                  isDirty={isSearchParagraphDirty(i)}
                  placeholder="Paragraph text..."
                />
              ))}
            </div>

            <div className="mt-8 rounded-lg border border-border bg-white p-6">
              <EditableField
                fieldKey="servicesLabel"
                value={meta.servicesLabel || ''}
                onChange={updateField}
                as="p"
                className="mb-4 font-semibold text-text"
                isDirty={dirtyFields.has('servicesLabel')}
                placeholder="Services label..."
              />
              <EditableBulletList
                metaKey="serviceBullets"
                value={meta.serviceBullets || ''}
                onChange={updateField}
              />
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section
        className="py-16 md:py-20"
        style={{ background: 'linear-gradient(135deg, #0f2744 0%, #1e3a5f 50%, #0f2744 100%)' }}
      >
        <div className="container-max">
          <div className="mx-auto max-w-3xl text-center">
            <p className="mb-4 text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.5)' }}>Call to Action</p>
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
                  placeholder="Button text..."
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

export default function AdminBuySidePage() {
  const [pageData, setPageData] = useState<PageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const pageRes = await authedApiFetch('/api/admin/pages/buy-side');
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
    <AdminPageProvider pageKey="buy-side" initialData={pageData}>
      <BuySidePageContent />
      <SaveBar />
    </AdminPageProvider>
  );
}
