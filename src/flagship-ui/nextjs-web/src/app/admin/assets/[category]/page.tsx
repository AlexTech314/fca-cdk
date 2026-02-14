'use client';

import { use, useEffect, useState, useCallback, useRef } from 'react';
import { PhotoAssetCard, FileAssetCard, type Asset } from '@/components/admin/AssetCard';
import { authedApiFetch } from '@/lib/admin/admin-fetch';

const ITEMS_PER_PAGE = 24;

// Map URL param to API category value
function categoryFromParam(param: string): 'photo' | 'file' {
  return param === 'photos' ? 'photo' : 'file';
}

export default function AssetManagerPage({ params }: { params: Promise<{ category: string }> }) {
  const { category: categoryParam } = use(params);
  const category = categoryFromParam(categoryParam);
  const isPhotos = category === 'photo';
  const title = isPhotos ? 'Images' : 'Files';

  // State
  const [assets, setAssets] = useState<Asset[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch assets
  const fetchAssets = useCallback(
    async (pageNum: number, append = false) => {
      if (!append) setLoading(true);
      else setLoadingMore(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          category,
          page: pageNum.toString(),
          limit: ITEMS_PER_PAGE.toString(),
        });
        if (debouncedSearch) params.set('search', debouncedSearch);

        const res = await authedApiFetch(`/api/admin/assets?${params}`);
        if (!res.ok) throw new Error('Failed to fetch assets');

        const data = await res.json();
        setAssets((prev) => (append ? [...prev, ...data.items] : data.items));
        setTotal(data.total);
        setPage(data.page);
        setTotalPages(data.totalPages);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [category, debouncedSearch]
  );

  // Re-fetch when category or search changes
  useEffect(() => {
    setAssets([]);
    setPage(1);
    fetchAssets(1);
  }, [fetchAssets]);

  // Load more
  const handleLoadMore = () => {
    if (page < totalPages) {
      fetchAssets(page + 1, true);
    }
  };

  // Upload
  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    for (const file of Array.from(files)) {
      setUploading(true);
      setUploadProgress(0);
      setError(null);

      try {
        // 1. Get presigned URL
        const presignRes = await authedApiFetch('/api/admin/assets/presigned-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: file.name,
            fileType: file.type,
            category,
            prefix: isPhotos ? 'images' : 'files',
          }),
        });
        if (!presignRes.ok) throw new Error('Failed to get upload URL');
        const { uploadUrl, s3Key } = await presignRes.json();

        // 2. Upload to S3 with progress tracking
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
              setUploadProgress(Math.round((e.loaded / e.total) * 100));
            }
          });
          xhr.addEventListener('load', () => {
            if (xhr.status >= 200 && xhr.status < 300) resolve();
            else reject(new Error(`Upload failed: ${xhr.status}`));
          });
          xhr.addEventListener('error', () => reject(new Error('Upload failed')));
          xhr.open('PUT', uploadUrl);
          xhr.setRequestHeader('Content-Type', file.type);
          xhr.send(file);
        });

        // 3. Create asset record in DB
        const createRes = await authedApiFetch('/api/admin/assets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: file.name,
            s3Key,
            fileType: file.type,
            fileSize: file.size,
            category,
          }),
        });
        if (!createRes.ok) throw new Error('Failed to create asset record');

        const newAsset = await createRes.json();

        // 4. Prepend to list
        setAssets((prev) => [newAsset, ...prev]);
        setTotal((prev) => prev + 1);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Upload failed');
      } finally {
        setUploading(false);
        setUploadProgress(0);
      }
    }

    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Delete
  const handleDelete = async (id: string) => {
    try {
      const res = await authedApiFetch(`/api/admin/assets/${id}`, { method: 'DELETE' });
      if (!res.ok && res.status !== 204) throw new Error('Failed to delete asset');
      setAssets((prev) => prev.filter((a) => a.id !== id));
      setTotal((prev) => prev - 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  // Drag and drop
  const [dragOver, setDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };
  const handleDragLeave = () => setDragOver(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleUpload(e.dataTransfer.files);
  };

  const acceptTypes = isPhotos
    ? 'image/*'
    : '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv';

  return (
    <div
      className="relative min-h-full"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Header bar */}
      <div className="sticky top-0 z-20 border-b border-gray-200 bg-white px-6 py-4">
        <div className="flex flex-wrap items-center gap-4">
          <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
          <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-500">
            {total}
          </span>

          {/* Search */}
          <div className="relative ml-auto flex-1 sm:max-w-xs">
            <svg
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
              />
            </svg>
            <input
              type="text"
              placeholder={`Search ${title.toLowerCase()}...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-8 text-sm text-gray-900 placeholder-gray-400 outline-none transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Upload button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 disabled:opacity-50"
          >
            {uploading ? (
              <>
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                {uploadProgress}%
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                </svg>
                Upload
              </>
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept={acceptTypes}
            multiple
            className="hidden"
            onChange={(e) => handleUpload(e.target.files)}
          />
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mx-6 mt-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
          </svg>
          {error}
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Drag overlay */}
      {dragOver && (
        <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center bg-blue-50/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-blue-400 bg-white/80 px-12 py-10">
            <svg className="h-10 w-10 text-blue-500" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
            </svg>
            <p className="text-sm font-medium text-blue-700">Drop files to upload</p>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="p-6">
        {loading ? (
          // Skeleton
          <div className={isPhotos
            ? 'grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6'
            : 'flex flex-col gap-2'
          }>
            {Array.from({ length: 12 }).map((_, i) => (
              isPhotos ? (
                <div key={i} className="aspect-square animate-pulse rounded-lg bg-gray-100" />
              ) : (
                <div key={i} className="h-16 animate-pulse rounded-lg bg-gray-100" />
              )
            ))}
          </div>
        ) : assets.length === 0 ? (
          // Empty state
          <div className="flex flex-col items-center justify-center py-20">
            <div className="mb-4 rounded-full bg-gray-100 p-4">
              {isPhotos ? (
                <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth="1" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Z" />
                </svg>
              ) : (
                <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth="1" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                </svg>
              )}
            </div>
            <h3 className="mb-1 text-sm font-medium text-gray-900">
              {debouncedSearch
                ? `No ${title.toLowerCase()} found for "${debouncedSearch}"`
                : `No ${title.toLowerCase()} yet`}
            </h3>
            <p className="mb-4 text-xs text-gray-500">
              {debouncedSearch
                ? 'Try a different search term.'
                : `Upload your first ${isPhotos ? 'image' : 'file'} to get started.`}
            </p>
            {!debouncedSearch && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Upload {isPhotos ? 'Image' : 'File'}
              </button>
            )}
          </div>
        ) : isPhotos ? (
          // Photo grid
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {assets.map((asset) => (
              <PhotoAssetCard key={asset.id} asset={asset} onDelete={handleDelete} />
            ))}
          </div>
        ) : (
          // File list
          <div className="flex flex-col gap-2">
            {assets.map((asset) => (
              <FileAssetCard key={asset.id} asset={asset} onDelete={handleDelete} />
            ))}
          </div>
        )}

        {/* Load more */}
        {!loading && page < totalPages && (
          <div className="mt-6 flex justify-center">
            <button
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 disabled:opacity-50"
            >
              {loadingMore ? (
                <>
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Loading...
                </>
              ) : (
                <>Load more ({total - assets.length} remaining)</>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
