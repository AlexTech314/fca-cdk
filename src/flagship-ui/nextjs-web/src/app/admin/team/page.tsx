'use client';

import { useEffect, useState } from 'react';
import { AdminPageProvider, useAdminPage } from '@/components/admin/AdminPageContext';
import { SaveBar } from '@/components/admin/SaveBar';
import { EditableField } from '@/components/admin/EditableField';
import { EditableTeamGrid } from '@/components/admin/sections/EditableTeamGrid';
import { EditableCommunityServices } from '@/components/admin/sections/EditableCommunityServices';
import { toAssetUrl } from '@/lib/utils';
import { authedApiFetch } from '@/lib/admin/admin-fetch';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

interface PageData {
  title: string;
  content: string;
  metadata: Record<string, string>;
}

interface TeamMember {
  id: string;
  name: string;
  title: string;
  image: string | null;
  bio: string;
  email: string | null;
  linkedIn: string | null;
  category: string;
  sortOrder: number;
}

interface CommunityService {
  id: string;
  name: string;
  description: string;
  url: string;
  sortOrder: number;
}

// ============================================
// Inner content component (needs AdminPageContext)
// ============================================

function TeamPageContent({
  leadership,
  analysts,
  communityServices,
}: {
  leadership: TeamMember[];
  analysts: TeamMember[];
  communityServices: CommunityService[];
}) {
  const { data, updateField, dirtyFields } = useAdminPage();
  const meta = data.metadata;

  return (
    <div className="bg-background">
      {/* Hero */}
      <section className="bg-gradient-to-b from-primary to-primary-dark py-16 text-center text-white">
        <div className="container-max">
          <EditableField
            fieldKey="title"
            value={data.title}
            onChange={updateField}
            as="h1"
            className="text-3xl font-bold md:text-4xl"
            isDirty={dirtyFields.has('title')}
            placeholder="Page title..."
          />
          <EditableField
            fieldKey="description"
            value={meta.description || ''}
            onChange={updateField}
            as="p"
            className="mx-auto mt-4 max-w-2xl text-lg text-white/80"
            isDirty={dirtyFields.has('description')}
            placeholder="Page description..."
          />
        </div>
      </section>

      {/* Leadership Section */}
      <section className="pt-16 pb-8 md:pt-24 md:pb-12">
        <div className="container-max">
          <div className="mb-12 text-center">
            <EditableField
              fieldKey="leadershipSubtitle"
              value={meta.leadershipSubtitle || ''}
              onChange={updateField}
              as="p"
              className="mb-2 text-sm font-semibold uppercase tracking-wider text-secondary"
              isDirty={dirtyFields.has('leadershipSubtitle')}
              placeholder="Subtitle..."
            />
            <EditableField
              fieldKey="leadershipTitle"
              value={meta.leadershipTitle || ''}
              onChange={updateField}
              as="h2"
              className="text-3xl font-bold text-primary md:text-4xl"
              isDirty={dirtyFields.has('leadershipTitle')}
              placeholder="Section title..."
            />
            <EditableField
              fieldKey="leadershipDescription"
              value={meta.leadershipDescription || ''}
              onChange={updateField}
              as="p"
              className="mx-auto mt-4 max-w-2xl text-lg text-text-muted"
              isDirty={dirtyFields.has('leadershipDescription')}
              placeholder="Section description..."
            />
          </div>

          <EditableTeamGrid
            initialMembers={leadership}
            category="leadership"
            changeKey="leadership"
          />
        </div>
      </section>

      {/* Analysts Section */}
      <section className="bg-surface pt-8 pb-16 md:pt-12 md:pb-24">
        <div className="container-max">
          <div className="mb-12 text-center">
            <EditableField
              fieldKey="analystSubtitle"
              value={meta.analystSubtitle || ''}
              onChange={updateField}
              as="p"
              className="mb-2 text-sm font-semibold uppercase tracking-wider text-secondary"
              isDirty={dirtyFields.has('analystSubtitle')}
              placeholder="Subtitle..."
            />
            <EditableField
              fieldKey="analystTitle"
              value={meta.analystTitle || ''}
              onChange={updateField}
              as="h2"
              className="text-3xl font-bold text-primary md:text-4xl"
              isDirty={dirtyFields.has('analystTitle')}
              placeholder="Section title..."
            />
          </div>

          <EditableTeamGrid
            initialMembers={analysts}
            category="analyst"
            changeKey="analysts"
          />
        </div>
      </section>

      {/* Community Service Section */}
      <section className="py-16 md:py-24">
        <div className="container-max">
          <div className="mb-12 text-center">
            <EditableField
              fieldKey="communitySubtitle"
              value={meta.communitySubtitle || ''}
              onChange={updateField}
              as="p"
              className="mb-2 text-sm font-semibold uppercase tracking-wider text-secondary"
              isDirty={dirtyFields.has('communitySubtitle')}
              placeholder="Subtitle..."
            />
            <EditableField
              fieldKey="communityTitle"
              value={meta.communityTitle || ''}
              onChange={updateField}
              as="h2"
              className="text-3xl font-bold text-primary md:text-4xl"
              isDirty={dirtyFields.has('communityTitle')}
              placeholder="Section title..."
            />
            <EditableField
              fieldKey="communityDescription"
              value={meta.communityDescription || ''}
              onChange={updateField}
              as="p"
              className="mx-auto mt-4 max-w-2xl text-lg text-text-muted"
              isDirty={dirtyFields.has('communityDescription')}
              placeholder="Section description..."
            />
          </div>

          <EditableCommunityServices initialServices={communityServices} />
        </div>
      </section>

      {/* CTA Section */}
      <section
        className="py-16 md:py-20"
        style={{
          background:
            'linear-gradient(135deg, #0f2744 0%, #1e3a5f 50%, #0f2744 100%)',
        }}
      >
        <div className="container-max">
          <div className="mx-auto max-w-3xl text-center">
            <EditableField
              fieldKey="ctaTitle"
              value={meta.ctaTitle || ''}
              onChange={updateField}
              as="h2"
              className="text-3xl font-bold md:text-4xl"
              style={{ color: '#ffffff' }}
              isDirty={dirtyFields.has('ctaTitle')}
              placeholder="CTA title..."
            />

            <EditableField
              fieldKey="ctaDescription"
              value={meta.ctaDescription || ''}
              onChange={updateField}
              as="p"
              className="mt-4 text-lg"
              style={{ color: 'rgba(255, 255, 255, 0.85)' }}
              isDirty={dirtyFields.has('ctaDescription')}
              placeholder="CTA description..."
            />

            <div className="mt-8">
              <span
                className="inline-flex items-center justify-center rounded-md border-2 px-6 py-3 text-base font-semibold"
                style={{
                  borderColor: '#ffffff',
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  color: '#ffffff',
                }}
              >
                <EditableField
                  fieldKey="ctaText"
                  value={meta.ctaText || ''}
                  onChange={updateField}
                  as="span"
                  isDirty={dirtyFields.has('ctaText')}
                  placeholder="CTA button text..."
                />
              </span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

// ============================================
// Main page component
// ============================================

export default function AdminTeamPage() {
  const [pageData, setPageData] = useState<PageData | null>(null);
  const [leadership, setLeadership] = useState<TeamMember[]>([]);
  const [analysts, setAnalysts] = useState<TeamMember[]>([]);
  const [communityServices, setCommunityServices] = useState<CommunityService[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [pageRes, leadershipRes, analystRes, communityRes] = await Promise.all([
          authedApiFetch('/api/admin/pages/team'),
          fetch(`${API_URL}/team-members?category=leadership`),
          fetch(`${API_URL}/team-members?category=analyst`),
          fetch(`${API_URL}/community-services`),
        ]);

        if (!pageRes.ok) throw new Error('Failed to fetch page data');

        const page = await pageRes.json();
        const leadershipData: TeamMember[] = leadershipRes.ok ? await leadershipRes.json() : [];
        const analystData: TeamMember[] = analystRes.ok ? await analystRes.json() : [];
        const communityData: CommunityService[] = communityRes.ok ? await communityRes.json() : [];

        // Transform metadata values to strings
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

        // Resolve image URLs
        setLeadership(
          leadershipData.map((m) => ({
            ...m,
            image: toAssetUrl(m.image) || m.image,
          }))
        );
        setAnalysts(
          analystData.map((m) => ({
            ...m,
            image: toAssetUrl(m.image) || m.image,
          }))
        );
        setCommunityServices(communityData);
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
    <AdminPageProvider pageKey="team" initialData={pageData}>
      <TeamPageContent
        leadership={leadership}
        analysts={analysts}
        communityServices={communityServices}
      />
      <SaveBar />
    </AdminPageProvider>
  );
}
