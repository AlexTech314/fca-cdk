'use client';

import Image from 'next/image';
import { useEffect, useState, useCallback, useRef } from 'react';
import { authedApiFetch } from '@/lib/admin/admin-fetch';
import { toAssetUrl } from '@/lib/utils';

interface Asset {
  id: string;
  fileName: string;
  s3Key: string;
  fileType: string;
  fileSize: number | null;
  title: string | null;
}

interface AssetPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (s3Url: string) => void;
  currentValue?: string;
  /** Asset category to browse. Defaults to 'photo'. */
  category?: 'photo' | 'file';
}

export function AssetPickerModal({
  isOpen,
  onClose,
  onSelect,
  currentValue,
  category = 'photo',
}: AssetPickerModalProps) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedS3Key, setSelectedS3Key] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch assets
  const fetchAssets = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        category,
        limit: '60',
        page: '1',
      });
      if (debouncedSearch) params.set('search', debouncedSearch);

      const res = await authedApiFetch(`/api/admin/assets?${params}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setAssets(data.items || []);
    } catch {
      setAssets([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, category]);

  // Fetch when opened or search/category changes
  useEffect(() => {
    if (isOpen) {
      fetchAssets();
    }
  }, [isOpen, fetchAssets]);

  // Reset state when opened
  useEffect(() => {
    if (isOpen) {
      setSearch('');
      setSelectedS3Key(null);
      setUploadError(null);
    }
  }, [isOpen]);

  // Upload a file, create asset record, add to grid, and auto-select it
  const handleUpload = async (file: File) => {
    if (category === 'photo' && !file.type.startsWith('image/')) {
      setUploadError('Only image files are allowed');
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setUploadError(null);

    try {
      // 1. Get presigned URL
      const presignRes = await authedApiFetch('/api/admin/assets/presigned-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type,
          category,
          prefix: category === 'photo' ? 'images' : 'files',
        }),
      });
      if (!presignRes.ok) throw new Error('Failed to get upload URL');
      const { uploadUrl, s3Key } = await presignRes.json();

      // 2. Upload to S3
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

      // 3. Create asset record
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

      const newAsset: Asset = await createRes.json();

      // 4. Prepend to grid and auto-select
      setAssets((prev) => [newAsset, ...prev]);
      setSelectedS3Key(newAsset.s3Key);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleUpload(file);
  };

  const handleSelect = () => {
    if (selectedS3Key) {
      const url = toAssetUrl(selectedS3Key);
      if (url) onSelect(url);
      // Don't call onClose() here -- the parent controls isOpen via state
      // set in onSelect. Calling onClose() would trigger cleanup that
      // conflicts with multi-step flows (e.g. awards: pick image -> enter name).
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="relative flex max-h-[80vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl"
        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDragOver(true); }}
        onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setDragOver(false); }}
        onDrop={handleDrop}
      >
        {/* Drag overlay */}
        {dragOver && (
          <div className="absolute inset-0 z-50 flex items-center justify-center rounded-xl bg-blue-50/90 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-blue-400 bg-white/80 px-12 py-10">
              <svg className="h-10 w-10 text-blue-500" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
              </svg>
              <p className="text-sm font-medium text-blue-700">Drop image to upload</p>
            </div>
          </div>
        )}

        {/* Upload progress overlay */}
        {uploading && (
          <div className="absolute inset-0 z-50 flex items-center justify-center rounded-xl bg-white/90 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3">
              <svg className="h-8 w-8 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <p className="text-sm font-medium text-gray-700">Uploading... {uploadProgress}%</p>
              <div className="h-1.5 w-48 overflow-hidden rounded-full bg-gray-200">
                <div
                  className="h-full rounded-full bg-blue-500 transition-all"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Select Image</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
              </svg>
              Upload
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept={category === 'photo' ? 'image/*' : '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv'}
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleUpload(file);
              }}
            />
            <button
              onClick={onClose}
              className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Upload error */}
        {uploadError && (
          <div className="mx-6 mt-3 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {uploadError}
            <button onClick={() => setUploadError(null)} className="ml-auto text-red-400 hover:text-red-600">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Search */}
        <div className="border-b border-gray-100 px-6 py-3">
          <div className="relative">
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
              placeholder="Search images..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-4 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              autoFocus
            />
          </div>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="grid grid-cols-4 gap-3 sm:grid-cols-5">
              {Array.from({ length: 15 }).map((_, i) => (
                <div key={i} className="aspect-square animate-pulse rounded-lg bg-gray-100" />
              ))}
            </div>
          ) : assets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <svg className="mb-2 h-8 w-8 text-gray-300" fill="none" viewBox="0 0 24 24" strokeWidth="1" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Z" />
              </svg>
              <p className="text-sm text-gray-500">
                {debouncedSearch ? `No images found for "${debouncedSearch}"` : 'No images available'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-3 sm:grid-cols-5">
              {assets.map((asset) => {
                const url = toAssetUrl(asset.s3Key);
                const isSelected = selectedS3Key === asset.s3Key;
                const isCurrent = currentValue === url;

                return (
                  <button
                    key={asset.id}
                    onClick={() => setSelectedS3Key(asset.s3Key)}
                    className={`group relative aspect-square overflow-hidden rounded-lg border-2 transition-all ${
                      isSelected
                        ? 'border-blue-500 ring-2 ring-blue-200'
                        : isCurrent
                          ? 'border-blue-300'
                          : 'border-transparent hover:border-gray-300'
                    }`}
                  >
                    {url && category === 'photo' ? (
                      <Image
                        src={url}
                        alt={asset.title || asset.fileName}
                        fill
                        className="object-contain bg-gray-50 p-1"
                        sizes="150px"
                      />
                    ) : (
                      <div className="flex h-full flex-col items-center justify-center gap-1.5 bg-gray-50 p-2">
                        <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                        </svg>
                        <p className="max-w-full truncate text-[9px] text-gray-500">{asset.fileName}</p>
                      </div>
                    )}

                    {/* Selected checkmark */}
                    {isSelected && (
                      <div className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 shadow">
                        <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                        </svg>
                      </div>
                    )}

                    {/* Current badge */}
                    {isCurrent && !isSelected && (
                      <div className="absolute left-1 top-1 rounded bg-blue-500/80 px-1.5 py-0.5 text-[9px] font-medium text-white">
                        Current
                      </div>
                    )}

                    {/* Hover filename */}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-1.5 pb-1 pt-4 opacity-0 transition-opacity group-hover:opacity-100">
                      <p className="truncate text-[10px] text-white">
                        {asset.title || asset.fileName}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSelect}
            disabled={!selectedS3Key}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Select
          </button>
        </div>
      </div>
    </div>
  );
}
