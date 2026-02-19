'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ArticleEditor } from '@/components/admin/ArticleEditor';
import { useUnsavedChanges } from '@/components/admin/UnsavedChangesContext';
import { authedApiFetch } from '@/lib/admin/admin-fetch';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

interface Tag { id: string; name: string; slug: string; category?: string | null; }
interface BlogPost {
  id: string; slug: string; title: string; excerpt: string | null; content: string;
  author: string | null; category: string | null; publishedAt: string | null;
  isPublished: boolean; tags: Tag[];
  tombstone?: { id: string; slug: string; name: string } | null;
}

export default function AdminResourceDetailPage() {
  const params = useParams();
  const slug = params.slug as string;
  const { requestNavigation } = useUnsavedChanges();

  const [post, setPost] = useState<BlogPost | null>(null);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [postsRes, tagsRes] = await Promise.all([
          authedApiFetch('/api/admin/blog-posts?category=resource&limit=200'),
          fetch(`${API_URL}/tags`),
        ]);

        if (!postsRes.ok) throw new Error('Failed to fetch resources');

        const postsData = await postsRes.json();
        const items: BlogPost[] = postsData.items || postsData;
        const match = items.find((p) => p.slug === slug);

        if (!match) throw new Error('Resource not found');

        // Fetch full article by ID (list endpoint strips content for perf)
        const fullRes = await authedApiFetch(`/api/admin/blog-posts/${match.id}`);
        if (fullRes.ok) {
          const fullPost = await fullRes.json();
          setPost(fullPost);
        } else {
          setPost(match);
        }
        setAllTags(tagsRes.ok ? await tagsRes.json() : []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [slug]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <svg className="mx-auto h-8 w-8 animate-spin text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="mt-4 text-sm text-text-muted">Loading resource...</p>
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-semibold text-red-600">{error || 'Resource not found'}</p>
          <button onClick={() => requestNavigation('/admin/resources')} className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white">
            Back to Resources
          </button>
        </div>
      </div>
    );
  }

  return (
    <ArticleEditor
      post={post}
      category="resource"
      allTags={allTags}
      backHref="/admin/resources"
      backLabel="Back to Resources"
    />
  );
}
