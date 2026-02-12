'use client';

import { useEffect, useState } from 'react';
import { AdminPageProvider, useAdminPage } from '@/components/admin/AdminPageContext';
import { SaveBar } from '@/components/admin/SaveBar';
import { EditableField } from '@/components/admin/EditableField';
import { BlogPostsTable } from '@/components/admin/sections/BlogPostsTable';
import { useUnsavedChanges } from '@/components/admin/UnsavedChangesContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

interface PageData { title: string; content: string; metadata: Record<string, string>; }
interface BlogPost {
  id: string; slug: string; title: string; excerpt: string | null; content: string;
  author: string | null; category: string | null; publishedAt: string | null;
  isPublished: boolean; tags: { id: string; name: string; slug: string }[];
}

type ViewMode = 'grid' | 'table';

function ResourceGridPreview({ posts }: { posts: BlogPost[] }) {
  const { requestNavigation } = useUnsavedChanges();

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {posts.map((post) => (
        <button
          key={post.id}
          onClick={() => requestNavigation(`/admin/resources/${post.slug}`)}
          className="group block rounded-xl border border-border bg-white p-6 text-left shadow-sm transition-all hover:border-secondary/30 hover:shadow-lg"
        >
          {post.category && (
            <span className="inline-block rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">{post.category}</span>
          )}
          {post.author && <p className="mt-2 text-xs text-text-muted">By {post.author}</p>}
          <h3 className="mt-2 text-lg font-semibold text-text group-hover:text-primary">{post.title}</h3>
          <p className="mt-2 text-sm text-text-muted line-clamp-3">{post.excerpt || post.content.slice(0, 150)}</p>
          {!post.isPublished && (
            <span className="mt-2 inline-block rounded bg-red-100 px-1.5 py-0.5 text-[9px] font-medium text-red-700">Draft</span>
          )}
        </button>
      ))}
    </div>
  );
}

function ResourcesPageContent({ posts }: { posts: BlogPost[] }) {
  const { data, updateField, dirtyFields } = useAdminPage();
  const meta = data.metadata;
  const [viewMode, setViewMode] = useState<ViewMode>('table');

  return (
    <div className="bg-background">
      <section className="bg-gradient-to-b from-primary to-primary-dark py-16 text-center text-white">
        <div className="container-max">
          <EditableField fieldKey="subtitle" value={meta.subtitle || ''} onChange={updateField} as="p" className="mb-2 text-sm font-semibold uppercase tracking-wider text-white/60" isDirty={dirtyFields.has('subtitle')} placeholder="Subtitle..." />
          <EditableField fieldKey="title" value={data.title} onChange={updateField} as="h1" className="text-3xl font-bold md:text-4xl" isDirty={dirtyFields.has('title')} placeholder="Page title..." />
          <EditableField fieldKey="description" value={meta.description || ''} onChange={updateField} as="p" className="mx-auto mt-4 max-w-2xl text-lg text-white/80" isDirty={dirtyFields.has('description')} placeholder="Description..." />
        </div>
      </section>

      <section className="py-12 md:py-16">
        <div className="container-max">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <EditableField fieldKey="sectionSubtitle" value={meta.sectionSubtitle || ''} onChange={updateField} as="p" className="mb-1 text-sm font-semibold uppercase tracking-wider text-secondary" isDirty={dirtyFields.has('sectionSubtitle')} placeholder="Section subtitle..." />
              <EditableField fieldKey="sectionTitle" value={meta.sectionTitle || ''} onChange={updateField} as="h2" className="text-2xl font-bold text-primary" isDirty={dirtyFields.has('sectionTitle')} placeholder="Section title..." />
            </div>
            <div className="flex rounded-lg border border-border bg-white p-0.5 shadow-sm">
              <button onClick={() => setViewMode('grid')} className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${viewMode === 'grid' ? 'bg-primary text-white' : 'text-text-muted hover:text-text'}`}>Grid</button>
              <button onClick={() => setViewMode('table')} className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${viewMode === 'table' ? 'bg-primary text-white' : 'text-text-muted hover:text-text'}`}>Table</button>
            </div>
          </div>

          {viewMode === 'grid' ? (
            <ResourceGridPreview posts={posts} />
          ) : (
            <BlogPostsTable initialPosts={posts} category="resource" detailBasePath="/admin/resources" />
          )}
        </div>
      </section>

      <section className="py-16 md:py-20" style={{ background: 'linear-gradient(135deg, #0f2744 0%, #1e3a5f 50%, #0f2744 100%)' }}>
        <div className="container-max">
          <div className="mx-auto max-w-3xl text-center">
            <EditableField fieldKey="ctaTitle" value={meta.ctaTitle || ''} onChange={updateField} as="h2" className="text-3xl font-bold md:text-4xl" style={{ color: '#ffffff' }} isDirty={dirtyFields.has('ctaTitle')} placeholder="CTA title..." />
            <EditableField fieldKey="ctaDescription" value={meta.ctaDescription || ''} onChange={updateField} as="p" className="mt-4 text-lg" style={{ color: 'rgba(255,255,255,0.85)' }} isDirty={dirtyFields.has('ctaDescription')} placeholder="CTA description..." />
            <div className="mt-8">
              <span className="inline-flex items-center justify-center rounded-md border-2 px-6 py-3 text-base font-semibold" style={{ borderColor: '#ffffff', backgroundColor: 'rgba(255,255,255,0.1)', color: '#ffffff' }}>
                <EditableField fieldKey="ctaText" value={meta.ctaText || ''} onChange={updateField} as="span" isDirty={dirtyFields.has('ctaText')} placeholder="CTA button text..." />
              </span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default function AdminResourcesPage() {
  const [pageData, setPageData] = useState<PageData | null>(null);
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [pageRes, postsRes] = await Promise.all([
          fetch('/api/admin/pages/resources'),
          fetch(`${API_URL}/blog-posts?category=resource&limit=200`),
        ]);
        if (!pageRes.ok) throw new Error('Failed to fetch page data');
        const page = await pageRes.json();
        const postData = postsRes.ok ? await postsRes.json() : { items: [] };
        const metadata: Record<string, string> = {};
        if (page.metadata) { for (const [k, v] of Object.entries(page.metadata)) { metadata[k] = String(v ?? ''); } }
        setPageData({ title: page.title || '', content: page.content || '', metadata });
        setPosts(postData.items || postData);
      } catch (err) { setError(err instanceof Error ? err.message : 'Failed to load data'); }
      finally { setLoading(false); }
    }
    fetchData();
  }, []);

  if (loading) return (<div className="flex min-h-[60vh] items-center justify-center"><div className="text-center"><svg className="mx-auto h-8 w-8 animate-spin text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg><p className="mt-4 text-sm text-text-muted">Loading...</p></div></div>);
  if (error || !pageData) return (<div className="flex min-h-[60vh] items-center justify-center"><div className="text-center"><p className="text-lg font-semibold text-red-600">{error || 'Failed to load'}</p><button onClick={() => window.location.reload()} className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white">Retry</button></div></div>);

  return (
    <AdminPageProvider pageKey="resources" initialData={pageData}>
      <ResourcesPageContent posts={posts} />
      <SaveBar />
    </AdminPageProvider>
  );
}
