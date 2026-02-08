'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { AdminPageProvider } from '@/components/admin/AdminPageContext';
import { SaveBar } from '@/components/admin/SaveBar';
import { EditableField } from '@/components/admin/EditableField';
import { EditableServicesGrid } from '@/components/admin/sections/EditableServicesGrid';
import { EditableAboutCTA } from '@/components/admin/sections/EditableAboutCTA';
import { useAdminPage } from '@/components/admin/AdminPageContext';
import { toAssetUrl } from '@/lib/utils';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

interface PageData {
  title: string;
  content: string;
  metadata: Record<string, string>;
}

interface ServiceOffering {
  id: string;
  title: string;
  category: string;
}

interface IndustrySector {
  id: string;
  name: string;
  description: string;
}

interface CoreValue {
  id: string;
  title: string;
  description: string;
  icon: string;
}

// ============================================
// Inner component (needs AdminPageContext)
// ============================================

function AboutPageContent({
  content,
  industrySectors,
  coreValues,
}: {
  content: string;
  industrySectors: IndustrySector[];
  coreValues: CoreValue[];
}) {
  const { data, updateField, dirtyFields } = useAdminPage();
  const meta = data.metadata;

  return (
    <>
      {/* Compact Hero */}
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
          <EditableField
            fieldKey="heroDescription"
            value={meta.heroDescription || ''}
            onChange={updateField}
            as="p"
            className="mx-auto mt-4 max-w-2xl text-lg"
            style={{ color: 'rgba(255, 255, 255, 0.85)' }}
            isDirty={dirtyFields.has('heroDescription')}
            placeholder="Hero description..."
          />
        </div>
      </section>

      {/* Company Overview */}
      <section className="py-16 md:py-24">
        <div className="container-max">
          <div className="mx-auto max-w-3xl">
            <EditableField
              fieldKey="companyHeading"
              value={meta.companyHeading || ''}
              onChange={updateField}
              as="h2"
              className="mb-6 text-3xl font-bold text-primary"
              isDirty={dirtyFields.has('companyHeading')}
              placeholder="Company heading..."
            />
            <div className="space-y-4 text-lg text-text-muted">
              {content
                .split('\n\n')
                .filter((p) => p.trim())
                .map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
            </div>
          </div>
        </div>
      </section>

      {/* Investment Criteria */}
      <section className="py-16 md:py-24">
        <div className="container-max">
          <div className="mb-12 text-center">
            <EditableField
              fieldKey="targetSubtitle"
              value={meta.targetSubtitle || ''}
              onChange={updateField}
              as="p"
              className="mb-2 text-sm font-semibold uppercase tracking-wider text-secondary"
              isDirty={dirtyFields.has('targetSubtitle')}
              placeholder="Section subtitle..."
            />
            <EditableField
              fieldKey="targetTitle"
              value={meta.targetTitle || ''}
              onChange={updateField}
              as="h2"
              className="text-3xl font-bold text-primary md:text-4xl"
              isDirty={dirtyFields.has('targetTitle')}
              placeholder="Section title..."
            />
          </div>

          {/* Financial & Other Criteria */}
          <div className="mb-12 grid gap-8 md:grid-cols-2">
            <div className="rounded-xl border border-border bg-white p-8">
              <EditableField
                fieldKey="financialCriteriaHeading"
                value={meta.financialCriteriaHeading || 'Financial Criteria'}
                onChange={updateField}
                as="h3"
                className="mb-4 text-lg font-semibold text-text"
                isDirty={dirtyFields.has('financialCriteriaHeading')}
                placeholder="Heading..."
              />
              <ul className="space-y-3 text-text-muted">
                {(meta.financialCriteria || '')
                  .split('\n')
                  .filter((s) => s.trim())
                  .map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-secondary" />
                      {item}
                    </li>
                  ))}
              </ul>
            </div>

            <div className="rounded-xl border border-border bg-white p-8">
              <EditableField
                fieldKey="otherCriteriaHeading"
                value={meta.otherCriteriaHeading || 'Other Criteria'}
                onChange={updateField}
                as="h3"
                className="mb-4 text-lg font-semibold text-text"
                isDirty={dirtyFields.has('otherCriteriaHeading')}
                placeholder="Heading..."
              />
              <ul className="space-y-3 text-text-muted">
                {(meta.otherCriteria || '')
                  .split('\n')
                  .filter((s) => s.trim())
                  .map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-secondary" />
                      {item}
                    </li>
                  ))}
              </ul>
            </div>
          </div>

          {/* Industry Sectors (read-only) */}
          <EditableField
            fieldKey="industrySectorsHeading"
            value={meta.industrySectorsHeading || 'Industry Sectors'}
            onChange={updateField}
            as="h3"
            className="mb-6 text-center text-xl font-semibold text-text"
            isDirty={dirtyFields.has('industrySectorsHeading')}
            placeholder="Heading..."
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {industrySectors.map((sector) => (
              <div
                key={sector.id}
                className="rounded-lg border border-border bg-surface p-5"
              >
                <h4 className="mb-2 font-semibold text-primary">{sector.name}</h4>
                <p className="text-sm text-text-muted">{sector.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Core Values (read-only) */}
      <section className="bg-gradient-to-b from-surface to-surface-blue/30 py-16 md:py-24">
        <div className="container-max">
          <div className="mb-8 flex justify-center">
            <Image
              src="https://fca-assets-113862367661.s3.us-east-2.amazonaws.com/logos/fca-mountain-on-white.png"
              alt="Flatirons Capital Advisors"
              width={200}
              height={80}
              className="h-16 w-auto"
            />
          </div>
          <div className="mb-12 text-center">
            <EditableField
              fieldKey="valuesSubtitle"
              value={meta.valuesSubtitle || ''}
              onChange={updateField}
              as="p"
              className="mb-2 text-sm font-semibold uppercase tracking-wider text-secondary"
              isDirty={dirtyFields.has('valuesSubtitle')}
              placeholder="Section subtitle..."
            />
            <EditableField
              fieldKey="valuesTitle"
              value={meta.valuesTitle || ''}
              onChange={updateField}
              as="h2"
              className="text-3xl font-bold text-primary md:text-4xl"
              isDirty={dirtyFields.has('valuesTitle')}
              placeholder="Section title..."
            />
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {coreValues.map((value) => (
              <div
                key={value.id}
                className="flex flex-col items-center rounded-xl border border-border bg-white p-6 text-center shadow-sm transition-all hover:border-secondary/30 hover:shadow-lg hover:shadow-primary/10"
              >
                <div className="relative mb-4 h-12 w-12">
                  <Image
                    src={value.icon}
                    alt={value.title}
                    fill
                    className="object-contain"
                    sizes="48px"
                  />
                </div>
                <h3 className="mb-2 font-semibold text-primary">{value.title}</h3>
                <p className="text-sm text-text-muted">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

// ============================================
// Main page component
// ============================================

export default function AdminAboutPage() {
  const [pageData, setPageData] = useState<PageData | null>(null);
  const [buySideServices, setBuySideServices] = useState<ServiceOffering[]>([]);
  const [sellSideServices, setSellSideServices] = useState<ServiceOffering[]>([]);
  const [strategicServices, setStrategicServices] = useState<ServiceOffering[]>([]);
  const [industrySectors, setIndustrySectors] = useState<IndustrySector[]>([]);
  const [coreValues, setCoreValues] = useState<CoreValue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [pageRes, buyRes, sellRes, stratRes, sectorsRes, valuesRes] =
          await Promise.all([
            fetch('/api/admin/pages/about'),
            fetch(`${API_URL}/service-offerings?category=buy-side&type=service`),
            fetch(`${API_URL}/service-offerings?category=sell-side&type=service`),
            fetch(`${API_URL}/service-offerings?category=strategic&type=service`),
            fetch(`${API_URL}/industry-sectors`),
            fetch(`${API_URL}/core-values`),
          ]);

        if (!pageRes.ok) throw new Error('Failed to fetch page data');

        const page = await pageRes.json();
        const buySide = buyRes.ok ? await buyRes.json() : [];
        const sellSide = sellRes.ok ? await sellRes.json() : [];
        const strategic = stratRes.ok ? await stratRes.json() : [];
        const sectors = sectorsRes.ok ? await sectorsRes.json() : [];
        const values = valuesRes.ok ? await valuesRes.json() : [];

        // Transform metadata to strings
        const metadata: Record<string, string> = {};
        if (page.metadata) {
          for (const [key, value] of Object.entries(page.metadata)) {
            // Arrays get joined with newlines for text editing
            if (Array.isArray(value)) {
              metadata[key] = value.join('\n');
            } else {
              metadata[key] = String(value ?? '');
            }
          }
        }

        setPageData({
          title: page.title || '',
          content: page.content || '',
          metadata,
        });

        setBuySideServices(buySide);
        setSellSideServices(sellSide);
        setStrategicServices(strategic);
        setIndustrySectors(sectors);

        // Resolve core value icon URLs
        setCoreValues(
          values.map((v: CoreValue) => ({
            ...v,
            icon: toAssetUrl(v.icon) || v.icon,
          }))
        );
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
    <AdminPageProvider pageKey="about" initialData={pageData}>
      <div className="bg-background">
        <AboutPageContent
          content={pageData.content}
          industrySectors={industrySectors}
          coreValues={coreValues}
        />

        {/* M&A Services (reuses staged EditableServicesGrid) */}
        <EditableServicesGrid
          initialBuySide={buySideServices}
          initialSellSide={sellSideServices}
          initialStrategic={strategicServices}
        />

        <EditableAboutCTA />
      </div>

      <SaveBar />
    </AdminPageProvider>
  );
}
