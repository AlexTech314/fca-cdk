'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { BlockNoteSchema, defaultBlockSpecs } from '@blocknote/core';
import { filterSuggestionItems } from '@blocknote/core/extensions';
import { useCreateBlockNote, getDefaultReactSlashMenuItems, SuggestionMenuController } from '@blocknote/react';
import { BlockNoteView, lightDefaultTheme, type Theme } from '@blocknote/mantine';
import '@blocknote/core/fonts/inter.css';
import '@blocknote/mantine/style.css';

import { useUnsavedChanges } from './UnsavedChangesContext';
import { EditableInlineField } from './EditableInlineField';
import { IndustryPicker } from './IndustryPicker';
import { AssetPickerModal } from './AssetPickerModal';
import { createAssetImage } from './blocks/AssetImageBlock';
import { createAssetFile } from './blocks/AssetFileBlock';
import { authedApiFetch } from '@/lib/admin/admin-fetch';
import { toAssetUrl } from '@/lib/utils';

// ============================================
// Types
// ============================================

interface Industry {
  id: string;
  name: string;
  slug: string;
  category?: string | null;
}

interface Tombstone {
  id: string;
  name: string;
  slug: string;
}

interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content: string;
  author: string | null;
  category: string | null;
  publishedAt: string | null;
  isPublished: boolean;
  industries: Industry[];
  tombstone?: { id: string; slug: string; name: string } | null;
}

interface ArticleEditorProps {
  post: BlogPost;
  category: 'news' | 'resource';
  allIndustries: Industry[];
  allTombstones?: Tombstone[];
  backHref: string;
  backLabel: string;
}

// ============================================
// Custom BlockNote schema (removes unwanted blocks, adds asset blocks)
// ============================================

// Remove unwanted block types, add custom asset blocks
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

// Slash menu items to exclude by title
const excludedSlashItems = new Set([
  'Toggle Heading 1', 'Toggle Heading 2', 'Toggle Heading 3',
  'Heading 4', 'Heading 5', 'Heading 6',
  'Toggle List',
  'Emoji',
]);

// ============================================
// Component
// ============================================

// Theme with transparent editor background
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

export function ArticleEditor({
  post: initialPost,
  category,
  allIndustries,
  allTombstones,
  backHref,
  backLabel,
}: ArticleEditorProps) {
  const { requestNavigation } = useUnsavedChanges();

  // Local state
  const [post, setPost] = useState<BlogPost>(initialPost);
  const [original, setOriginal] = useState<BlogPost>(initialPost);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [markdownContent, setMarkdownContent] = useState(initialPost.content);

  // Press release picker
  const [prPickerOpen, setPrPickerOpen] = useState(false);
  const [prSearch, setPrSearch] = useState('');

  // Delete
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Asset picker state (for custom image/file blocks)
  const [assetPickerOpen, setAssetPickerOpen] = useState(false);
  const [assetPickerBlockId, setAssetPickerBlockId] = useState<string | null>(null);
  const [assetPickerCategory, setAssetPickerCategory] = useState<'photo' | 'file'>('photo');

  // BlockNote editor with custom schema
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
      // Parse body content into blocks
      const bodyBlocks = initialPost.content
        ? await editor.tryParseMarkdownToBlocks(initialPost.content)
        : [];

      // Replace all blocks: body
      editor.replaceBlocks(editor.document, bodyBlocks);
    }
    loadContent();
  }, [editor, initialPost.content, initialPost.title]);

  // Sync editor changes to markdown content
  const handleEditorChange = useCallback(async () => {
    const allBlocks = editor.document;
    const md = await editor.blocksToMarkdownLossy(allBlocks);
    setMarkdownContent(md);
    setPost((prev) => ({ ...prev, content: md }));
  }, [editor]);

  const isDirty = useMemo(() => {
    return JSON.stringify(post) !== JSON.stringify(original);
  }, [post, original]);

  const handleSave = async () => {
    setSaving(true);
    setSaveSuccess(false);
    setError(null);

    try {
      const res = await authedApiFetch(`/api/admin/blog-posts/${post.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: post.title,
          excerpt: post.excerpt,
          content: markdownContent,
          author: post.author,
          publishedAt: post.publishedAt,
          isPublished: post.isPublished,
          industryIds: post.industries.map((i) => i.id),
        }),
      });

      if (!res.ok) throw new Error('Failed to save');

      // Reset original to current state so isDirty resets
      setOriginal({ ...post, content: markdownContent });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await authedApiFetch(`/api/admin/blog-posts/${post.id}`, { method: 'DELETE' });
      if (!res.ok && res.status !== 204) throw new Error('Delete failed');
      requestNavigation(backHref);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
      setDeleting(false);
    }
  };

  const togglePublish = async () => {
    const newVal = !post.isPublished;
    setPost((prev) => ({ ...prev, isPublished: newVal }));
  };

  const updateField = (field: string, value: string | boolean | null) => {
    setPost((prev) => ({ ...prev, [field]: value }));
  };

  const filteredTombstones = allTombstones?.filter((t) =>
    !prSearch || t.name.toLowerCase().includes(prSearch.toLowerCase())
  ) || [];

  return (
    <div className="flex h-full flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between border-b border-border bg-white px-4 py-2.5 shadow-sm">
        <div className="flex items-center gap-4">
          <button
            onClick={() => requestNavigation(backHref)}
            className="flex items-center gap-1.5 text-sm font-medium text-text-muted transition-colors hover:text-text"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
            </svg>
            {backLabel}
          </button>

        </div>

        <div className="flex items-center gap-3">
          {saveSuccess && (
            <span className="flex items-center gap-1 text-sm text-green-600">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
              Saved
            </span>
          )}
          {error && <span className="text-sm text-red-600">{error}</span>}

          {/* Publish toggle */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-muted">{post.isPublished ? 'Published' : 'Draft'}</span>
            <button
              onClick={togglePublish}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                post.isPublished ? 'bg-green-500' : 'bg-gray-300'
              }`}
            >
              <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                post.isPublished ? 'translate-x-4' : 'translate-x-0.5'
              }`} />
            </button>
          </div>

          <button
            onClick={handleSave}
            disabled={saving || !isDirty}
            className="rounded-lg bg-primary px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>

          {/* Sidebar toggle */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="rounded p-1.5 text-text-muted transition-colors hover:bg-surface hover:text-text"
            title={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
          >
            <svg className={`h-4 w-4 transition-transform ${sidebarOpen ? '' : 'rotate-180'}`} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5M12 17.25h8.25" />
            </svg>
          </button>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Editor / Preview */}
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-[90%] px-8 py-6">
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

                  // Filter out unwanted items
                  const filtered = defaultItems.filter(
                    (item) => !excludedSlashItems.has(item.title)
                  );

                  // Add custom asset items
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

        {/* Collapsible sidebar */}
        <div
          className={`shrink-0 overflow-hidden border-l border-border bg-white transition-all duration-300 ${
            sidebarOpen ? 'w-80' : 'w-0'
          }`}
        >
          <div className="h-full w-80 overflow-y-auto p-4">
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-text-muted">Article Settings</h3>

            {/* Title */}
            <div className="mb-4">
              <label className="mb-1 block text-xs font-medium text-text-muted">Title</label>
              <EditableInlineField
                value={post.title}
                onChangeValue={(v) => updateField('title', v)}
                originalValue={original.title}
                as="p"
                className="text-sm font-medium text-text"
                placeholder="Article title..."
              />
            </div>

            {/* Excerpt */}
            <div className="mb-4">
              <label className="mb-1 block text-xs font-medium text-text-muted">Excerpt</label>
              <EditableInlineField
                value={post.excerpt || ''}
                onChangeValue={(v) => updateField('excerpt', v || null)}
                originalValue={original.excerpt || ''}
                as="p"
                multiline
                className="text-sm text-text-muted"
                placeholder="Brief excerpt..."
              />
            </div>

            {/* Author */}
            <div className="mb-4">
              <label className="mb-1 block text-xs font-medium text-text-muted">Author</label>
              <EditableInlineField
                value={post.author || ''}
                onChangeValue={(v) => updateField('author', v || null)}
                originalValue={original.author || ''}
                as="p"
                className="text-sm text-text"
                placeholder="Author name..."
              />
            </div>

            {/* Published Date (news only) */}
            {category === 'news' && (
              <div className="mb-4">
                <label className="mb-1 block text-xs font-medium text-text-muted">Published Date</label>
                <input
                  type="date"
                  value={post.publishedAt ? new Date(post.publishedAt).toISOString().split('T')[0] : ''}
                  onChange={(e) => updateField('publishedAt', e.target.value ? new Date(e.target.value).toISOString() : null)}
                  className="w-full rounded-lg border border-border bg-white px-3 py-1.5 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                />
              </div>
            )}

            {/* Published toggle */}
            <div className="mb-4 flex items-center justify-between rounded-lg border border-border p-3">
              <span className="text-sm font-medium text-text">Published</span>
              <button
                onClick={togglePublish}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                  post.isPublished ? 'bg-green-500' : 'bg-gray-300'
                }`}
              >
                <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                  post.isPublished ? 'translate-x-4' : 'translate-x-0.5'
                }`} />
              </button>
            </div>

            {/* Industries */}
            <div className="mb-4">
              <label className="mb-2 block text-xs font-medium text-text-muted">Industries</label>
              <IndustryPicker
                selectedIndustries={post.industries}
                allIndustries={allIndustries}
                onChange={(industries) => setPost((prev) => ({ ...prev, industries }))}
              />
            </div>

            {/* Press Release link (news only) */}
            {category === 'news' && allTombstones && (
              <div className="mb-4">
                <label className="mb-2 block text-xs font-medium text-text-muted">Linked Transaction</label>
                {post.tombstone ? (
                  <div className="flex items-center justify-between rounded-lg border border-border p-3">
                    <div>
                      <p className="text-sm font-medium text-text">{post.tombstone.name}</p>
                      <p className="text-[10px] text-text-muted">/transactions/{post.tombstone.slug}</p>
                    </div>
                    <button
                      onClick={() => setPost((prev) => ({ ...prev, tombstone: null }))}
                      className="text-xs font-medium text-red-600 hover:text-red-700"
                    >
                      Unlink
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <button
                      onClick={() => setPrPickerOpen(!prPickerOpen)}
                      className="w-full rounded-lg border border-dashed border-gray-300 px-3 py-2 text-sm text-gray-400 hover:border-blue-400 hover:text-blue-500"
                    >
                      Link a transaction...
                    </button>
                    {prPickerOpen && (
                      <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-48 overflow-y-auto rounded-lg border border-border bg-white shadow-lg">
                        <div className="sticky top-0 border-b border-border bg-white p-2">
                          <input
                            type="text"
                            placeholder="Search transactions..."
                            value={prSearch}
                            onChange={(e) => setPrSearch(e.target.value)}
                            className="w-full rounded border border-border px-2 py-1 text-xs outline-none focus:border-blue-400"
                            autoFocus
                          />
                        </div>
                        {filteredTombstones.slice(0, 20).map((t) => (
                          <button
                            key={t.id}
                            onClick={() => {
                              setPost((prev) => ({ ...prev, tombstone: { id: t.id, slug: t.slug, name: t.name } }));
                              setPrPickerOpen(false);
                              setPrSearch('');
                            }}
                            className="flex w-full flex-col px-3 py-2 text-left hover:bg-blue-50"
                          >
                            <span className="text-xs font-medium text-text">{t.name}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Danger zone */}
            <div className="mt-6 rounded-lg border border-red-200 bg-red-50/50 p-3">
              <p className="mb-2 text-xs font-medium text-red-800">Danger Zone</p>
              {deleteConfirm ? (
                <div className="flex gap-2">
                  <button onClick={() => setDeleteConfirm(false)} className="flex-1 rounded border border-gray-300 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50">Cancel</button>
                  <button onClick={handleDelete} disabled={deleting} className="flex-1 rounded bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-700 disabled:opacity-50">
                    {deleting ? 'Deleting...' : 'Confirm Delete'}
                  </button>
                </div>
              ) : (
                <button onClick={() => setDeleteConfirm(true)} className="w-full rounded border border-red-300 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-100">
                  Delete Article
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Asset Picker Modal for custom image/file blocks */}
      <AssetPickerModal
        isOpen={assetPickerOpen}
        onClose={() => { setAssetPickerOpen(false); setAssetPickerBlockId(null); }}
        onSelect={handleAssetSelected}
        category={assetPickerCategory}
      />
    </div>
  );
}
