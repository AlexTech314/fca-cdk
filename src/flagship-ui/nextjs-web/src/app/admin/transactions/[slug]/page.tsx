'use client';

import Image from 'next/image';
import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useUnsavedChanges } from '@/components/admin/UnsavedChangesContext';
import { AssetPickerModal } from '@/components/admin/AssetPickerModal';
import { EditableInlineField } from '@/components/admin/EditableInlineField';
import { TagPicker } from '@/components/admin/TagPicker';
import { toAssetUrl } from '@/lib/utils';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

interface Tag {
  id: string;
  name: string;
  slug: string;
  category?: string | null;
}

interface BlogPost {
  id: string;
  slug: string;
  title: string;
  category: string | null;
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
  previewToken: string;
  tags: Tag[];
  pressRelease?: { id: string; slug: string; title: string } | null;
}

export default function AdminTransactionDetailPage() {
  const params = useParams();
  const slug = params.slug as string;
  const { requestNavigation } = useUnsavedChanges();

  const [tombstone, setTombstone] = useState<Tombstone | null>(null);
  const [original, setOriginal] = useState<Tombstone | null>(null);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [allPosts, setAllPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Photo picker
  const [pickerOpen, setPickerOpen] = useState(false);

  // Delete
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Press release picker
  const [prPickerOpen, setPrPickerOpen] = useState(false);
  const [prSearch, setPrSearch] = useState('');

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch all tombstones (admin route includes unpublished) and find by slug
        const tombRes = await fetch('/api/admin/tombstones?limit=200');
        const tagsRes = await fetch(`${API_URL}/tags`);
        const postsRes = await fetch(`${API_URL}/blog-posts?category=news&limit=100`);

        if (!tombRes.ok) throw new Error('Failed to fetch transaction');

        const tombData = await tombRes.json();
        const items: Tombstone[] = tombData.items || tombData;
        const match = items.find((t: Tombstone) => t.slug === slug);

        if (!match) throw new Error('Transaction not found');

        // Resolve image URL
        const resolved: Tombstone = {
          ...match,
          asset: match.asset ? { ...match.asset } : null,
        };

        setTombstone(resolved);
        setOriginal(JSON.parse(JSON.stringify(resolved)));
        setAllTags(tagsRes.ok ? await tagsRes.json() : []);

        if (postsRes.ok) {
          const postData = await postsRes.json();
          setAllPosts(postData.items || postData);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [slug]);

  const isDirty = useCallback((): boolean => {
    if (!tombstone || !original) return false;
    return JSON.stringify(tombstone) !== JSON.stringify(original);
  }, [tombstone, original]);

  const handleSave = async () => {
    if (!tombstone) return;
    setSaving(true);
    setSaveSuccess(false);

    try {
      // Update main fields
      const res = await fetch(`/api/admin/tombstones/${tombstone.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: tombstone.name,
          assetId: tombstone.assetId,
          industry: tombstone.industry,
          role: tombstone.role,
          buyerPeFirm: tombstone.buyerPeFirm,
          buyerPlatform: tombstone.buyerPlatform,
          transactionYear: tombstone.transactionYear,
          city: tombstone.city,
          state: tombstone.state,
          isPublished: tombstone.isPublished,
          tagIds: tombstone.tags.map((t) => t.id),
        }),
      });
      if (!res.ok) throw new Error('Failed to save');

      // Update press release link if changed
      const origPrId = original?.pressRelease?.id || null;
      const currPrId = tombstone.pressRelease?.id || null;
      if (origPrId !== currPrId) {
        const prRes = await fetch(`/api/admin/tombstones/${tombstone.id}/press-release`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pressReleaseId: currPrId }),
        });
        if (!prRes.ok) throw new Error('Failed to update press release');
      }

      setOriginal(JSON.parse(JSON.stringify(tombstone)));
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!tombstone) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/tombstones/${tombstone.id}`, { method: 'DELETE' });
      if (!res.ok && res.status !== 204) throw new Error('Delete failed');
      requestNavigation('/admin/transactions');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
      setDeleting(false);
    }
  };

  const updateField = (field: string, value: string | number | boolean | null) => {
    if (!tombstone) return;
    setTombstone((prev) => prev ? { ...prev, [field]: value } : prev);
  };

  const handleImageSelected = (s3Url: string) => {
    // We store the s3Key (relative), not the full URL
    // The AssetPickerModal returns the s3Key
    if (!tombstone) return;
    setTombstone((prev) => prev ? {
      ...prev,
      asset: prev.asset ? { ...prev.asset, s3Key: s3Url } : { id: '', s3Key: s3Url, fileName: '', fileType: '' },
    } : prev);
    setPickerOpen(false);
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <svg className="mx-auto h-8 w-8 animate-spin text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="mt-4 text-sm text-text-muted">Loading transaction...</p>
        </div>
      </div>
    );
  }

  if (error && !tombstone) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-semibold text-red-600">{error}</p>
          <button onClick={() => requestNavigation('/admin/transactions')} className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white">
            Back to Transactions
          </button>
        </div>
      </div>
    );
  }

  if (!tombstone) return null;

  const imageUrl = tombstone.asset?.s3Key ? toAssetUrl(tombstone.asset.s3Key) : null;
  const newsPosts = allPosts.filter((p) => (p.category || '').toLowerCase() === 'news');

  return (
    <div className="bg-background">
      {/* Header bar */}
      <div className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-white px-6 py-3 shadow-sm">
        <button
          onClick={() => requestNavigation('/admin/transactions')}
          className="flex items-center gap-1.5 text-sm font-medium text-text-muted transition-colors hover:text-text"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
          Back to Transactions
        </button>

        <div className="flex items-center gap-3">
          {saveSuccess && (
            <span className="flex items-center gap-1 text-sm text-green-600">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
              Saved
            </span>
          )}
          {error && tombstone && (
            <span className="text-sm text-red-600">{error}</span>
          )}
          <button
            onClick={handleSave}
            disabled={saving || !isDirty()}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      <div className="container-max py-8">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Left: Image + publish + delete */}
          <div className="space-y-6">
            {/* Image */}
            <div
              className="group relative cursor-pointer overflow-hidden rounded-xl border border-border bg-gray-100"
              style={{ aspectRatio: '391/450' }}
              onClick={() => setPickerOpen(true)}
            >
              {imageUrl ? (
                <Image src={imageUrl} alt={tombstone.name} fill className="object-cover" sizes="(max-width: 1024px) 100vw, 33vw" />
              ) : (
                <div className="flex h-full items-center justify-center text-gray-300">
                  <svg className="h-16 w-16" fill="none" viewBox="0 0 24 24" strokeWidth="1" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Z" />
                  </svg>
                </div>
              )}
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                <span className="rounded bg-white/90 px-3 py-1.5 text-sm font-medium text-gray-700">
                  {imageUrl ? 'Change Image' : 'Add Image'}
                </span>
              </div>
            </div>

            {/* Published toggle */}
            <div className="flex items-center justify-between rounded-lg border border-border bg-white p-4">
              <div>
                <p className="text-sm font-medium text-text">Published</p>
                <p className="text-xs text-text-muted">Visible on public site</p>
              </div>
              <button
                onClick={() => updateField('isPublished', !tombstone.isPublished)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  tombstone.isPublished ? 'bg-green-500' : 'bg-gray-300'
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  tombstone.isPublished ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>

            {/* Delete */}
            <div className="rounded-lg border border-red-200 bg-red-50/50 p-4">
              <p className="mb-2 text-sm font-medium text-red-800">Danger Zone</p>
              {deleteConfirm ? (
                <div className="flex gap-2">
                  <button onClick={() => setDeleteConfirm(false)} className="flex-1 rounded border border-gray-300 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50">Cancel</button>
                  <button onClick={handleDelete} disabled={deleting} className="flex-1 rounded bg-red-600 px-3 py-1.5 text-xs text-white hover:bg-red-700 disabled:opacity-50">
                    {deleting ? 'Deleting...' : 'Confirm Delete'}
                  </button>
                </div>
              ) : (
                <button onClick={() => setDeleteConfirm(true)} className="w-full rounded border border-red-300 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100">
                  Delete Transaction
                </button>
              )}
            </div>
          </div>

          {/* Right: Fields */}
          <div className="space-y-6 lg:col-span-2">
            {/* Name */}
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-text-muted">Name / Seller</label>
              <EditableInlineField
                value={tombstone.name}
                onChangeValue={(v) => updateField('name', v)}
                originalValue={original?.name}
                as="h1"
                className="text-2xl font-bold text-text"
                placeholder="Company name..."
              />
            </div>

            {/* Details grid */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-text-muted">Industry</label>
                <EditableInlineField
                  value={tombstone.industry || ''}
                  onChangeValue={(v) => updateField('industry', v || null)}
                  originalValue={original?.industry || ''}
                  as="p"
                  className="text-sm text-text"
                  placeholder="Industry..."
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-text-muted">Role</label>
                <EditableInlineField
                  value={tombstone.role || ''}
                  onChangeValue={(v) => updateField('role', v || null)}
                  originalValue={original?.role || ''}
                  as="p"
                  className="text-sm text-text"
                  placeholder="Buy-side / Sell-side..."
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-text-muted">PE Firm</label>
                <EditableInlineField
                  value={tombstone.buyerPeFirm || ''}
                  onChangeValue={(v) => updateField('buyerPeFirm', v || null)}
                  originalValue={original?.buyerPeFirm || ''}
                  as="p"
                  className="text-sm text-text"
                  placeholder="PE firm..."
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-text-muted">Platform Company</label>
                <EditableInlineField
                  value={tombstone.buyerPlatform || ''}
                  onChangeValue={(v) => updateField('buyerPlatform', v || null)}
                  originalValue={original?.buyerPlatform || ''}
                  as="p"
                  className="text-sm text-text"
                  placeholder="Platform company..."
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-text-muted">Transaction Year</label>
                <EditableInlineField
                  value={tombstone.transactionYear?.toString() || ''}
                  onChangeValue={(v) => updateField('transactionYear', v ? parseInt(v, 10) || null : null)}
                  originalValue={original?.transactionYear?.toString() || ''}
                  as="p"
                  className="text-sm text-text"
                  placeholder="Year..."
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-text-muted">City</label>
                <EditableInlineField
                  value={tombstone.city || ''}
                  onChangeValue={(v) => updateField('city', v || null)}
                  originalValue={original?.city || ''}
                  as="p"
                  className="text-sm text-text"
                  placeholder="City..."
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-text-muted">State</label>
                <EditableInlineField
                  value={tombstone.state || ''}
                  onChangeValue={(v) => updateField('state', v || null)}
                  originalValue={original?.state || ''}
                  as="p"
                  className="text-sm text-text"
                  placeholder="State..."
                />
              </div>
            </div>

            {/* Tags */}
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-text-muted">Tags</label>
              <TagPicker
                selectedTags={tombstone.tags}
                allTags={allTags}
                onChange={(tags) => setTombstone((prev) => prev ? { ...prev, tags } : prev)}
              />
            </div>

            {/* Press Release */}
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-text-muted">Press Release</label>
              {tombstone.pressRelease ? (
                <div className="flex items-center justify-between rounded-lg border border-border bg-white p-4">
                  <div>
                    <p className="text-sm font-medium text-text">{tombstone.pressRelease.title}</p>
                    <p className="text-xs text-text-muted">/news/{tombstone.pressRelease.slug}</p>
                  </div>
                  <button
                    onClick={() => setTombstone((prev) => prev ? { ...prev, pressRelease: null } : prev)}
                    className="rounded px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                  >
                    Unlink
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <button
                    onClick={() => setPrPickerOpen(!prPickerOpen)}
                    className="w-full rounded-lg border border-dashed border-gray-300 px-4 py-3 text-sm text-gray-400 transition-colors hover:border-blue-400 hover:text-blue-500"
                  >
                    Link a press release...
                  </button>

                  {prPickerOpen && (
                    <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-64 overflow-y-auto rounded-lg border border-border bg-white shadow-lg">
                      <div className="sticky top-0 border-b border-border bg-white p-2">
                        <input
                          type="text"
                          placeholder="Search news articles..."
                          value={prSearch}
                          onChange={(e) => setPrSearch(e.target.value)}
                          className="w-full rounded border border-border px-2 py-1 text-xs outline-none focus:border-blue-400"
                          autoFocus
                        />
                      </div>
                      {newsPosts
                        .filter((p) => !prSearch || p.title.toLowerCase().includes(prSearch.toLowerCase()))
                        .map((post) => (
                          <button
                            key={post.id}
                            onClick={() => {
                              setTombstone((prev) => prev ? {
                                ...prev,
                                pressRelease: { id: post.id, slug: post.slug, title: post.title },
                              } : prev);
                              setPrPickerOpen(false);
                              setPrSearch('');
                            }}
                            className="flex w-full flex-col px-3 py-2 text-left hover:bg-blue-50"
                          >
                            <span className="text-xs font-medium text-text">{post.title}</span>
                            <span className="text-[10px] text-text-muted">/news/{post.slug}</span>
                          </button>
                        ))}
                      {newsPosts.filter((p) => !prSearch || p.title.toLowerCase().includes(prSearch.toLowerCase())).length === 0 && (
                        <p className="p-3 text-center text-xs text-text-muted">No matching articles</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Asset Picker Modal */}
      <AssetPickerModal
        isOpen={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={handleImageSelected}
        currentValue={imageUrl ?? undefined}
      />
    </div>
  );
}
