'use client';

import Image from 'next/image';
import { useState } from 'react';
import { toAssetUrl } from '@/lib/utils';

export interface Asset {
  id: string;
  fileName: string;
  s3Key: string;
  fileType: string;
  fileSize: number | null;
  category: string;
  title: string | null;
  description: string | null;
  createdAt: string;
}

interface AssetCardProps {
  asset: Asset;
  onDelete: (id: string) => void;
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return '--';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getFileIcon(fileType: string): string {
  if (fileType.includes('pdf')) return 'PDF';
  if (fileType.includes('word') || fileType.includes('doc')) return 'DOC';
  if (fileType.includes('sheet') || fileType.includes('xls') || fileType.includes('csv')) return 'XLS';
  if (fileType.includes('presentation') || fileType.includes('ppt')) return 'PPT';
  if (fileType.includes('text')) return 'TXT';
  return 'FILE';
}

function getFileIconColor(fileType: string): string {
  if (fileType.includes('pdf')) return '#e53e3e';
  if (fileType.includes('word') || fileType.includes('doc')) return '#3182ce';
  if (fileType.includes('sheet') || fileType.includes('xls') || fileType.includes('csv')) return '#38a169';
  if (fileType.includes('presentation') || fileType.includes('ppt')) return '#d69e2e';
  return '#718096';
}

export function PhotoAssetCard({ asset, onDelete }: AssetCardProps) {
  const [copied, setCopied] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const imageUrl = toAssetUrl(asset.s3Key);

  const handleCopy = async () => {
    if (!imageUrl) return;
    await navigator.clipboard.writeText(imageUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDelete = () => {
    onDelete(asset.id);
    setShowConfirm(false);
  };

  return (
    <div className="group relative overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition-all hover:shadow-md">
      {/* Image thumbnail */}
      <div className="relative aspect-square w-full bg-gray-50">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={asset.title || asset.fileName}
            fill
            className="object-contain p-2"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-gray-400">
            <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" strokeWidth="1" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Z" />
            </svg>
          </div>
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            onClick={handleCopy}
            className="rounded-md bg-white/90 px-3 py-1.5 text-xs font-medium text-gray-800 transition-colors hover:bg-white"
            title="Copy URL"
          >
            {copied ? 'Copied!' : 'Copy URL'}
          </button>
          <button
            onClick={() => setShowConfirm(true)}
            className="rounded-md bg-red-500/90 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-red-600"
            title="Delete"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
            </svg>
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="border-t border-gray-100 px-3 py-2">
        <p className="truncate text-xs font-medium text-gray-800" title={asset.fileName}>
          {asset.title || asset.fileName}
        </p>
        <p className="mt-0.5 text-[10px] text-gray-400">
          {formatFileSize(asset.fileSize)} &middot; {formatDate(asset.createdAt)}
        </p>
      </div>

      {/* Delete confirmation */}
      {showConfirm && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-white/95 p-4">
          <p className="text-center text-xs font-medium text-gray-800">
            Delete &ldquo;{asset.fileName}&rdquo;?
          </p>
          <p className="text-center text-[10px] text-gray-500">This cannot be undone.</p>
          <div className="flex gap-2">
            <button
              onClick={() => setShowConfirm(false)}
              className="rounded-md border border-gray-300 px-3 py-1 text-xs text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              className="rounded-md bg-red-600 px-3 py-1 text-xs text-white hover:bg-red-700"
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function FileAssetCard({ asset, onDelete }: AssetCardProps) {
  const [copied, setCopied] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const fileUrl = toAssetUrl(asset.s3Key);
  const iconLabel = getFileIcon(asset.fileType);
  const iconColor = getFileIconColor(asset.fileType);

  const handleCopy = async () => {
    if (!fileUrl) return;
    await navigator.clipboard.writeText(fileUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDelete = () => {
    onDelete(asset.id);
    setShowConfirm(false);
  };

  return (
    <div className="group relative flex items-center gap-4 rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm transition-all hover:shadow-md">
      {/* File icon */}
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold text-white"
        style={{ backgroundColor: iconColor }}
      >
        {iconLabel}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-gray-800" title={asset.fileName}>
          {asset.title || asset.fileName}
        </p>
        <p className="mt-0.5 text-xs text-gray-400">
          {asset.fileType.split('/').pop()?.toUpperCase()} &middot; {formatFileSize(asset.fileSize)} &middot; {formatDate(asset.createdAt)}
        </p>
      </div>

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          onClick={handleCopy}
          className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          title="Copy URL"
        >
          {copied ? (
            <svg className="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
          ) : (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9.75a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184" />
            </svg>
          )}
        </button>
        <button
          onClick={() => setShowConfirm(true)}
          className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
          title="Delete"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
          </svg>
        </button>
      </div>

      {/* Delete confirmation overlay */}
      {showConfirm && (
        <div className="absolute inset-0 z-10 flex items-center justify-center gap-3 rounded-lg bg-white/95 px-4">
          <p className="text-xs font-medium text-gray-800">
            Delete &ldquo;{asset.fileName}&rdquo;?
          </p>
          <button
            onClick={() => setShowConfirm(false)}
            className="rounded-md border border-gray-300 px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            className="rounded-md bg-red-600 px-2.5 py-1 text-xs text-white hover:bg-red-700"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}
