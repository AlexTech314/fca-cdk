'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAdminPage } from '../AdminPageContext';
import { useUnsavedChanges } from '../UnsavedChangesContext';
import { EditableInlineField } from '../EditableInlineField';

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
  tags: { id: string; name: string; slug: string }[];
}

interface BlogPostsTableProps {
  initialPosts: BlogPost[];
  category: 'news' | 'resource';
  detailBasePath: string; // e.g. '/admin/news' or '/admin/resources'
}

let tempIdCounter = 0;
function nextTempId(): string {
  return `temp-post-${++tempIdCounter}`;
}
function isTempId(id: string): boolean {
  return id.startsWith('temp-post-');
}

type ItemStatus = 'unchanged' | 'new' | 'modified' | 'deleted';

export function BlogPostsTable({ initialPosts, category, detailBasePath }: BlogPostsTableProps) {
  const { registerChanges, unregisterChanges } = useAdminPage();
  const { requestNavigation } = useUnsavedChanges();

  const [originalItems, setOriginalItems] = useState<BlogPost[]>(initialPosts);
  const [currentItems, setCurrentItems] = useState<BlogPost[]>(initialPosts);
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const currentRef = useRef(currentItems);
  const originalRef = useRef(originalItems);
  const deletedRef = useRef(deletedIds);
  currentRef.current = currentItems;
  originalRef.current = originalItems;
  deletedRef.current = deletedIds;

  const getOriginal = (id: string) => originalItems.find((p) => p.id === id);

  const hasChanged = (curr: BlogPost, orig: BlogPost): boolean => {
    return curr.title !== orig.title || curr.author !== orig.author || curr.isPublished !== orig.isPublished;
  };

  const getStatus = useCallback((item: BlogPost): ItemStatus => {
    if (deletedIds.has(item.id)) return 'deleted';
    if (isTempId(item.id)) return 'new';
    const orig = originalItems.find((p) => p.id === item.id);
    if (orig && hasChanged(item, orig)) return 'modified';
    return 'unchanged';
  }, [originalItems, deletedIds]);

  const computeDirtyCount = useCallback((): number => {
    const curr = currentRef.current;
    const orig = originalRef.current;
    const deleted = deletedRef.current;

    let count = deleted.size;
    count += curr.filter((p) => isTempId(p.id)).length;

    for (const c of curr) {
      if (isTempId(c.id) || deleted.has(c.id)) continue;
      const o = orig.find((p) => p.id === c.id);
      if (o && hasChanged(c, o)) count++;
    }

    return count;
  }, []);

  const saveItems = useCallback(async () => {
    const orig = originalRef.current;
    const curr = currentRef.current;
    const deleted = deletedRef.current;

    // Creates
    const creates = curr.filter((p) => isTempId(p.id) && !deleted.has(p.id));
    for (const post of creates) {
      const res = await fetch('/api/admin/blog-posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: post.title || 'Untitled',
          content: post.content || '',
          category,
          author: post.author,
          isPublished: post.isPublished,
        }),
      });
      if (!res.ok) throw new Error('Failed to create post');
    }

    // Updates
    for (const c of curr) {
      if (isTempId(c.id) || deleted.has(c.id)) continue;
      const o = orig.find((p) => p.id === c.id);
      if (o && hasChanged(c, o)) {
        // Update fields
        if (c.title !== o.title || c.author !== o.author) {
          const res = await fetch(`/api/admin/blog-posts/${c.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: c.title, author: c.author }),
          });
          if (!res.ok) throw new Error('Failed to update post');
        }
        // Toggle publish
        if (c.isPublished !== o.isPublished) {
          const res = await fetch(`/api/admin/blog-posts/${c.id}/publish`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ publish: c.isPublished }),
          });
          if (!res.ok) throw new Error('Failed to update publish status');
        }
      }
    }

    // Deletes
    for (const id of deleted) {
      if (isTempId(id)) continue;
      const res = await fetch(`/api/admin/blog-posts/${id}`, { method: 'DELETE' });
      if (!res.ok && res.status !== 204) throw new Error('Failed to delete post');
    }

    // Re-fetch
    const listRes = await fetch(`/api/admin/blog-posts?category=${category}&limit=200`);
    if (listRes.ok) {
      const data = await listRes.json();
      const fresh: BlogPost[] = data.items || data;
      setOriginalItems(fresh);
      setCurrentItems(fresh);
      setDeletedIds(new Set());
    }
  }, [category]);

  const discardItems = useCallback(() => {
    setCurrentItems([...originalRef.current]);
    setDeletedIds(new Set());
  }, []);

  useEffect(() => {
    registerChanges('blog-posts', {
      count: computeDirtyCount(),
      save: saveItems,
      discard: discardItems,
    });
  }, [currentItems, originalItems, deletedIds, registerChanges, computeDirtyCount, saveItems, discardItems]);

  useEffect(() => {
    return () => unregisterChanges('blog-posts');
  }, [unregisterChanges]);

  const updateField = (id: string, field: string, value: string | boolean | null) => {
    setCurrentItems((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: value } : p))
    );
  };

  const togglePublished = (id: string) => {
    setCurrentItems((prev) =>
      prev.map((p) => (p.id === id ? { ...p, isPublished: !p.isPublished } : p))
    );
  };

  const handleAdd = () => {
    setCurrentItems((prev) => [
      {
        id: nextTempId(),
        slug: '',
        title: '',
        excerpt: null,
        content: '',
        author: null,
        category,
        publishedAt: null,
        isPublished: false,
        tags: [],
      },
      ...prev,
    ]);
  };

  const handleDelete = (id: string) => {
    if (isTempId(id)) {
      setCurrentItems((prev) => prev.filter((p) => p.id !== id));
    } else {
      setDeletedIds((prev) => new Set(prev).add(id));
    }
    setDeleteConfirm(null);
  };

  const handleUndoDelete = (id: string) => {
    setDeletedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const formatDate = (dateStr: string | null): string => {
    if (!dateStr) return '--';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const filtered = currentItems.filter((p) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      p.title.toLowerCase().includes(q) ||
      (p.author || '').toLowerCase().includes(q) ||
      (p.excerpt || '').toLowerCase().includes(q)
    );
  });

  const rowClass = (status: ItemStatus): string => {
    switch (status) {
      case 'new': return 'bg-amber-50/50';
      case 'modified': return 'bg-amber-50/30';
      case 'deleted': return 'bg-red-50/50 opacity-50';
      default: return '';
    }
  };

  return (
    <div>
      {/* Toolbar */}
      <div className="mb-4 flex items-center gap-4">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <input
            type="text"
            placeholder={`Search ${category === 'news' ? 'news' : 'resources'}...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-border bg-white py-2 pl-10 pr-4 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
          />
        </div>
        <button
          onClick={handleAdd}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add {category === 'news' ? 'Article' : 'Resource'}
        </button>
        <span className="text-sm text-text-muted">{filtered.length} items</span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-border bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-surface text-xs font-semibold uppercase tracking-wider text-text-muted">
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3 w-32">Author</th>
              <th className="px-4 py-3 w-28">Date</th>
              <th className="px-4 py-3">Excerpt</th>
              <th className="px-4 py-3 w-14 text-center">Live</th>
              <th className="px-4 py-3 w-10"></th>
              <th className="px-4 py-3 w-20"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((post) => {
              const status = getStatus(post);
              const isDeleted = status === 'deleted';
              const orig = getOriginal(post.id);

              return (
                <tr
                  key={post.id}
                  className={`group border-b border-border/50 transition-colors hover:bg-blue-50/30 ${rowClass(status)}`}
                >
                  {/* Title */}
                  <td className="px-4 py-3 font-medium">
                    <EditableInlineField
                      value={post.title}
                      onChangeValue={(v) => updateField(post.id, 'title', v)}
                      originalValue={orig?.title}
                      as="span"
                      className="text-sm text-text"
                      placeholder="Title..."
                      disabled={isDeleted}
                    />
                  </td>

                  {/* Author */}
                  <td className="px-4 py-3">
                    <EditableInlineField
                      value={post.author || ''}
                      onChangeValue={(v) => updateField(post.id, 'author', v || null)}
                      originalValue={orig?.author || ''}
                      as="span"
                      className="text-sm text-text-muted"
                      placeholder="--"
                      disabled={isDeleted}
                    />
                  </td>

                  {/* Date */}
                  <td className="px-4 py-3 text-sm text-text-muted">
                    {formatDate(post.publishedAt)}
                  </td>

                  {/* Excerpt */}
                  <td className="px-4 py-3">
                    <p className={`text-sm text-text-muted line-clamp-1 ${isDeleted ? 'line-through' : ''}`}>
                      {post.excerpt || post.content.slice(0, 80) || '--'}
                    </p>
                  </td>

                  {/* Published */}
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => !isDeleted && togglePublished(post.id)}
                      disabled={isDeleted}
                      className={`inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                        post.isPublished ? 'bg-green-500' : 'bg-gray-300'
                      } ${isDeleted ? 'cursor-default opacity-50' : 'cursor-pointer'}`}
                    >
                      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                        post.isPublished ? 'translate-x-4' : 'translate-x-0.5'
                      }`} />
                    </button>
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3">
                    {status === 'new' && <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-medium text-amber-700">New</span>}
                    {status === 'modified' && <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-medium text-amber-700">Edited</span>}
                    {status === 'deleted' && <span className="rounded bg-red-100 px-1.5 py-0.5 text-[9px] font-medium text-red-700">Deleted</span>}
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      {isDeleted ? (
                        <button onClick={() => handleUndoDelete(post.id)} className="rounded px-2 py-0.5 text-[10px] font-medium text-red-600 hover:bg-red-50">Undo</button>
                      ) : (
                        <>
                          {!isTempId(post.id) && (
                            <button
                              onClick={() => requestNavigation(`${detailBasePath}/${post.slug}`)}
                              className="rounded p-1 text-gray-400 hover:bg-blue-50 hover:text-blue-600"
                              title="Edit article"
                            >
                              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
                              </svg>
                            </button>
                          )}
                          <button
                            onClick={() => setDeleteConfirm(post.id)}
                            className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500"
                            title="Delete"
                          >
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </>
                      )}
                    </div>

                    {deleteConfirm === post.id && (
                      <div className="absolute right-4 z-30 mt-1 rounded-lg border border-border bg-white p-3 shadow-lg">
                        <p className="mb-2 text-xs font-medium text-gray-800">Delete?</p>
                        <div className="flex gap-1.5">
                          <button onClick={() => setDeleteConfirm(null)} className="rounded border border-gray-300 px-2 py-0.5 text-[10px] text-gray-600 hover:bg-gray-50">Cancel</button>
                          <button onClick={() => handleDelete(post.id)} className="rounded bg-red-600 px-2 py-0.5 text-[10px] text-white hover:bg-red-700">Delete</button>
                        </div>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="py-12 text-center text-sm text-text-muted">
            {search ? 'No results match your search.' : `No ${category === 'news' ? 'news articles' : 'resources'} yet.`}
          </div>
        )}
      </div>
    </div>
  );
}
