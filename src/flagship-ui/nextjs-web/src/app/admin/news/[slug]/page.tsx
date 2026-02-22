'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ArticleEditor } from '@/components/admin/ArticleEditor';
import { useUnsavedChanges } from '@/components/admin/UnsavedChangesContext';
import { authedApiFetch } from '@/lib/admin/admin-fetch';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

interface Industry { id: string; name: string; slug: string; category?: string | null; }
interface Tombstone { id: string; name: string; slug: string; }
interface BlogPost {
  id: string; slug: string; title: string; excerpt: string | null; content: string;
  author: string | null; category: string | null; publishedAt: string | null;
  isPublished: boolean; industries: Industry[];
  tombstone?: { id: string; slug: string; name: string } | null;
}

export default function AdminNewsDetailPage() {
  const params = useParams();
  const slug = params.slug as string;
  const { requestNavigation } = useUnsavedChanges();

  const [post, setPost] = useState<BlogPost | null>(null);
  const [allIndustries, setAllIndustries] = useState<Industry[]>([]);
  const [allTombstones, setAllTombstones] = useState<Tombstone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [postsRes, industriesRes, tombstonesRes] = await Promise.all([
          authedApiFetch('/api/admin/blog-posts?category=news&limit=200'),
          fetch(`${API_URL}/industries`),
          fetch(`${API_URL}/tombstones?limit=200`),
        ]);

        if (!postsRes.ok) throw new Error('Failed to fetch articles');

        const postsData = await postsRes.json();
        const items: BlogPost[] = postsData.items || postsData;
        const match = items.find((p) => p.slug === slug);

        if (!match) throw new Error('Article not found');

        // Fetch full article by ID (list endpoint strips content for perf)
        const fullRes = await authedApiFetch(`/api/admin/blog-posts/${match.id}`);
        if (fullRes.ok) {
          const fullPost = await fullRes.json();
          setPost(fullPost);
        } else {
          setPost(match);
        }
        setAllIndustries(industriesRes.ok ? await industriesRes.json() : []);

        if (tombstonesRes.ok) {
          const tombData = await tombstonesRes.json();
          setAllTombstones((tombData.items || tombData).map((t: Tombstone & Record<string, unknown>) => ({
            id: t.id, name: (t as Record<string, string>).name || '', slug: t.slug,
          })));
        }
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
          <p className="mt-4 text-sm text-text-muted">Loading article...</p>
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-semibold text-red-600">{error || 'Article not found'}</p>
          <button onClick={() => requestNavigation('/admin/news')} className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white">
            Back to News
          </button>
        </div>
      </div>
    );
  }

  return (
    <ArticleEditor
      post={post}
      category="news"
      allIndustries={allIndustries}
      allTombstones={allTombstones}
      backHref="/admin/news"
      backLabel="Back to News"
    />
  );
}
