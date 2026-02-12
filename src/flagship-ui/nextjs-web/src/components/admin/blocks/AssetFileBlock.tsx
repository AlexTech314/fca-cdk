'use client';

import { createReactBlockSpec } from '@blocknote/react';

/**
 * Custom file block that uses our asset system instead of BlockNote's
 * default file upload. Stores the S3 URL in the `src` prop.
 */
export const createAssetFile = createReactBlockSpec(
  {
    type: 'assetFile',
    propSchema: {
      src: { default: '' },
      name: { default: '' },
    },
    content: 'none',
  },
  {
    render: (props) => {
      const { src, name } = props.block.props;
      const editor = props.editor;

      const requestAssetPicker = () => {
        const event = new CustomEvent('bn-asset-request', {
          detail: { blockId: props.block.id, category: 'file' },
        });
        window.dispatchEvent(event);
      };

      const handleDelete = () => {
        editor.removeBlocks([props.block]);
      };

      if (!src) {
        // Empty state
        return (
          <div
            onClick={requestAssetPicker}
            className="flex cursor-pointer items-center gap-3 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 px-4 py-4 text-gray-400 transition-colors hover:border-blue-400 hover:bg-blue-50/30 hover:text-blue-500"
            contentEditable={false}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
            </svg>
            <span className="text-sm font-medium">Click to add file from assets</span>
          </div>
        );
      }

      // File link with hover overlay
      return (
        <div className="group/asset relative my-2 flex items-center gap-3 rounded-lg border border-border bg-surface p-4" contentEditable={false}>
          <svg className="h-5 w-5 shrink-0 text-secondary" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
          </svg>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-text">{name || src.split('/').pop() || 'File'}</p>
            <p className="truncate text-xs text-text-muted">{src}</p>
          </div>

          {/* Hover actions */}
          <div className="flex items-center gap-1.5 opacity-0 transition-opacity group-hover/asset:opacity-100">
            <button
              onClick={requestAssetPicker}
              className="rounded bg-white px-2 py-1 text-xs font-medium text-gray-700 shadow hover:bg-gray-50"
            >
              Swap
            </button>
            <button
              onClick={handleDelete}
              className="rounded bg-red-500 px-2 py-1 text-xs font-medium text-white shadow hover:bg-red-600"
            >
              Remove
            </button>
          </div>
        </div>
      );
    },
    toExternalHTML: (props) => {
      const { src, name } = props.block.props;
      if (!src) return <p />;
      return (
        <a href={src} target="_blank" rel="noopener noreferrer">
          {name || src.split('/').pop() || 'Download file'}
        </a>
      );
    },
    parse: (element) => {
      // Parse <a> tags that look like file links
      if (
        element.tagName === 'A' &&
        element.getAttribute('href')?.includes('s3.') &&
        !element.querySelector('img')
      ) {
        return {
          src: element.getAttribute('href') || '',
          name: element.textContent || '',
        };
      }
      return undefined;
    },
  }
);
