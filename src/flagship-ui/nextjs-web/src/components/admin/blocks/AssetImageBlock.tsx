'use client';

import { createReactBlockSpec } from '@blocknote/react';

/**
 * Custom image block that uses our AssetPickerModal instead of BlockNote's
 * default file upload. Stores the S3 URL in the `src` prop so it persists
 * in markdown as `![alt](s3-url)`.
 *
 * The AssetPickerModal is rendered in ArticleEditor and controlled via a
 * callback passed through the editor's `onAssetRequest` custom option.
 */
export const createAssetImage = createReactBlockSpec(
  {
    type: 'assetImage',
    propSchema: {
      src: { default: '' },
      alt: { default: '' },
    },
    content: 'none',
  },
  {
    render: (props) => {
      const { src, alt } = props.block.props;
      const editor = props.editor;

      const requestAssetPicker = () => {
        // Dispatch a custom event that ArticleEditor listens for
        const event = new CustomEvent('bn-asset-request', {
          detail: { blockId: props.block.id, category: 'photo' },
        });
        window.dispatchEvent(event);
      };

      const handleDelete = () => {
        editor.removeBlocks([props.block]);
      };

      if (!src) {
        // Empty state: placeholder to add image
        return (
          <div
            onClick={requestAssetPicker}
            className="flex cursor-pointer items-center gap-3 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-gray-400 transition-colors hover:border-blue-400 hover:bg-blue-50/30 hover:text-blue-500"
            contentEditable={false}
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Z" />
            </svg>
            <span className="text-sm font-medium">Click to add image from assets</span>
          </div>
        );
      }

      // Image with hover overlay for swap/delete
      return (
        <div className="my-2 flex justify-center" contentEditable={false}>
          <div className="group/asset relative inline-block" style={{ maxWidth: '100%' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={alt || 'Article image'}
              className="max-w-full rounded-lg"
              draggable={false}
            />

            {/* Hover overlay — isolated from BlockNote color inheritance */}
            <div
              className="absolute inset-0 flex items-center justify-center gap-2 rounded-lg opacity-0 transition-opacity group-hover/asset:opacity-100"
              style={{ backgroundColor: 'rgba(0,0,0,0.4)', color: 'initial' }}
            >
              <button
                ref={(el) => { if (el) el.style.cssText = 'color:#000!important;background:#fff!important;padding:4px 12px;border-radius:6px;font-size:12px;font-weight:500;box-shadow:0 1px 3px rgba(0,0,0,.2);cursor:pointer;'; }}
                onClick={requestAssetPicker}
              >
                Swap Image
              </button>
              <button
                ref={(el) => { if (el) el.style.cssText = 'color:#fff!important;background:#ef4444!important;padding:4px 12px;border-radius:6px;font-size:12px;font-weight:500;box-shadow:0 1px 3px rgba(0,0,0,.2);cursor:pointer;'; }}
                onClick={handleDelete}
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      );
    },
    toExternalHTML: (props) => {
      const { src, alt } = props.block.props;
      if (!src) return <p />;
      // Renders as standard <img> which BlockNote converts to ![alt](src) in markdown
      return (
        <img src={src} alt={alt || 'image'} />
      );
    },
    parse: (element) => {
      if (element.tagName === 'IMG') {
        return {
          src: element.getAttribute('src') || '',
          alt: element.getAttribute('alt') || '',
        };
      }
      return undefined;
    },
  }
);
