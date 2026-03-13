'use client';

import { useEffect, useState, useCallback } from 'react';
import { BlockNoteSchema, defaultBlockSpecs } from '@blocknote/core';
import { filterSuggestionItems } from '@blocknote/core/extensions';
import { useCreateBlockNote, getDefaultReactSlashMenuItems, SuggestionMenuController } from '@blocknote/react';
import { BlockNoteView, lightDefaultTheme, type Theme } from '@blocknote/mantine';
import '@blocknote/core/fonts/inter.css';
import '@blocknote/mantine/style.css';

import { AdminPageProvider, useAdminPage } from '@/components/admin/AdminPageContext';
import { SaveBar } from '@/components/admin/SaveBar';
import { EditableField } from '@/components/admin/EditableField';
import { AssetPickerModal } from '@/components/admin/AssetPickerModal';
import { createAssetImage } from '@/components/admin/blocks/AssetImageBlock';
import { createAssetFile } from '@/components/admin/blocks/AssetFileBlock';
import { authedApiFetch } from '@/lib/admin/admin-fetch';

interface PageData {
  title: string;
  content: string;
  metadata: Record<string, string>;
}

// ============================================
// BlockNote schema (same as ArticleEditor)
// ============================================

const {
  image: _image,
  file: _file,
  video: _video,
  audio: _audio,
  codeBlock: _code,
  checkListItem: _check,
  toggleListItem: _toggle,
  ...keepBlockSpecs
} = defaultBlockSpecs;

const schema = BlockNoteSchema.create({
  blockSpecs: {
    ...keepBlockSpecs,
    assetImage: createAssetImage(),
    assetFile: createAssetFile(),
  },
});

const excludedSlashItems = new Set([
  'Toggle Heading 1', 'Toggle Heading 2', 'Toggle Heading 3',
  'Heading 4', 'Heading 5', 'Heading 6',
  'Toggle List',
  'Emoji',
]);

const transparentTheme: Theme = {
  ...lightDefaultTheme,
  colors: {
    ...lightDefaultTheme.colors,
    editor: {
      text: '#3f3f3f',
      background: 'transparent',
    },
  },
};

// ============================================
// Inner content (needs AdminPageContext)
// ============================================

function PrivacyPolicyPageContent() {
  const { data, updateField, dirtyFields } = useAdminPage();

  // Asset picker state for custom image/file blocks
  const [assetPickerOpen, setAssetPickerOpen] = useState(false);
  const [assetPickerBlockId, setAssetPickerBlockId] = useState<string | null>(null);
  const [assetPickerCategory, setAssetPickerCategory] = useState<'photo' | 'file'>('photo');

  const editor = useCreateBlockNote({ schema });

  // Listen for asset picker requests from custom blocks
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.blockId) {
        setAssetPickerBlockId(detail.blockId);
        setAssetPickerCategory(detail.category === 'file' ? 'file' : 'photo');
        setAssetPickerOpen(true);
      }
    };
    window.addEventListener('bn-asset-request', handler);
    return () => window.removeEventListener('bn-asset-request', handler);
  }, []);

  // Handle asset selected from picker
  const handleAssetSelected = useCallback((s3Url: string) => {
    if (assetPickerBlockId) {
      const block = editor.document.find((b) => b.id === assetPickerBlockId);
      if (block) {
        if (assetPickerCategory === 'photo') {
          editor.updateBlock(block, { props: { src: s3Url } } as never);
        } else {
          const fileName = s3Url.split('/').pop() || 'File';
          editor.updateBlock(block, { props: { src: s3Url, name: fileName } } as never);
        }
      }
    }
    setAssetPickerOpen(false);
    setAssetPickerBlockId(null);
  }, [editor, assetPickerBlockId, assetPickerCategory]);

  // Initialize editor content from markdown
  useEffect(() => {
    async function loadContent() {
      const blocks = data.content
        ? await editor.tryParseMarkdownToBlocks(data.content)
        : [];
      editor.replaceBlocks(editor.document, blocks);
    }
    loadContent();
    // Only run on mount — editor changes are synced via onChange
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync editor changes to content field
  const handleEditorChange = useCallback(async () => {
    const md = await editor.blocksToMarkdownLossy(editor.document);
    updateField('content', md);
  }, [editor, updateField]);

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
        </div>
      </section>

      {/* BlockNote Content Editor */}
      <section className="py-16 md:py-24">
        <div className="container-max">
          <div className="mx-auto max-w-3xl">
            <div className={`min-h-[400px] ${
              dirtyFields.has('content')
                ? 'outline-dotted outline-1 outline-offset-2 outline-amber-400/60'
                : ''
            }`}>
              <BlockNoteView
                editor={editor}
                onChange={handleEditorChange}
                theme={transparentTheme}
                data-article-editor
                slashMenu={false}
              >
                <SuggestionMenuController
                  triggerCharacter="/"
                  getItems={async (query) => {
                    const defaultItems = getDefaultReactSlashMenuItems(editor);
                    const filtered = defaultItems.filter(
                      (item) => !excludedSlashItems.has(item.title)
                    );
                    const customItems = [
                      ...filtered,
                      {
                        title: 'Image',
                        subtext: 'Insert an image from assets',
                        onItemClick: () => {
                          editor.insertBlocks(
                            [{ type: 'assetImage' as never }],
                            editor.getTextCursorPosition().block,
                            'after'
                          );
                        },
                        aliases: ['image', 'photo', 'picture', 'img'],
                        group: 'Media',
                        icon: (
                          <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Z" />
                          </svg>
                        ),
                      },
                      {
                        title: 'File',
                        subtext: 'Insert a file from assets',
                        onItemClick: () => {
                          editor.insertBlocks(
                            [{ type: 'assetFile' as never }],
                            editor.getTextCursorPosition().block,
                            'after'
                          );
                        },
                        aliases: ['file', 'document', 'attachment', 'download'],
                        group: 'Media',
                        icon: (
                          <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                          </svg>
                        ),
                      },
                    ];
                    return filterSuggestionItems(customItems, query);
                  }}
                />
              </BlockNoteView>
            </div>
          </div>
        </div>
      </section>

      <AssetPickerModal
        isOpen={assetPickerOpen}
        onClose={() => { setAssetPickerOpen(false); setAssetPickerBlockId(null); }}
        onSelect={handleAssetSelected}
        category={assetPickerCategory}
      />
    </div>
  );
}

// ============================================
// Main page component
// ============================================

export default function AdminPrivacyPolicyPage() {
  const [pageData, setPageData] = useState<PageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const pageRes = await authedApiFetch('/api/admin/pages/privacy-policy');
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
    <AdminPageProvider pageKey="privacy-policy" initialData={pageData}>
      <PrivacyPolicyPageContent />
      <SaveBar />
    </AdminPageProvider>
  );
}
