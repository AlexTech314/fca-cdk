'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import Image from 'next/image';
import { AdminPageProvider } from '@/components/admin/AdminPageContext';
import { SaveBar } from '@/components/admin/SaveBar';
import { EditableField } from '@/components/admin/EditableField';
import { EditableInlineField } from '@/components/admin/EditableInlineField';
import { EditableServicesGrid } from '@/components/admin/sections/EditableServicesGrid';
import { EditableAboutCTA } from '@/components/admin/sections/EditableAboutCTA';
import { AssetPickerModal } from '@/components/admin/AssetPickerModal';
import { useAdminPage } from '@/components/admin/AdminPageContext';
import { toAssetUrl } from '@/lib/utils';
import { authedApiFetch } from '@/lib/admin/admin-fetch';

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
  type: string;
  sortOrder?: number;
}

interface IndustryRef {
  id: string;
  name: string;
  slug: string;
}

interface IndustrySector {
  id: string;
  name: string;
  description: string;
  image: string | null;
  industry: IndustryRef | null;
}

interface CoreValue {
  id: string;
  title: string;
  description: string;
  icon: string;
}

// ============================================
// Editable criteria list (metadata-backed bullets)
// ============================================

interface CriteriaItem {
  id: string;
  text: string;
}

type CriteriaStatus = 'unchanged' | 'new' | 'modified' | 'deleted';

let criteriaIdCounter = 0;
function nextCriteriaId(): string {
  return `crit-new-${++criteriaIdCounter}`;
}

function parseCriteria(value: string): CriteriaItem[] {
  return value
    .split('\n')
    .filter((s) => s.trim())
    .map((text, i) => ({ id: `crit-${i}`, text }));
}

function EditableCriteriaList({
  metaKey,
  value,
  onChange,
}: {
  metaKey: string;
  value: string;
  onChange: (key: string, value: string) => void;
}) {
  const { saveStatus } = useAdminPage();

  // Local state with stable IDs
  const [items, setItems] = useState<CriteriaItem[]>(() => parseCriteria(value));
  const [origItems, setOrigItems] = useState<CriteriaItem[]>(() => parseCriteria(value));
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
  // Track whether we triggered the value change ourselves
  const selfUpdate = useRef(false);

  // Re-initialize on save success (value may not change but local state needs resetting)
  useEffect(() => {
    if (saveStatus === 'success') {
      const parsed = parseCriteria(value);
      setItems(parsed);
      setOrigItems(parsed);
      setDeletedIds(new Set());
    }
  }, [saveStatus, value]);

  // Detect external changes (discard) by watching the metadata value
  useEffect(() => {
    if (selfUpdate.current) {
      selfUpdate.current = false;
      return;
    }
    const parsed = parseCriteria(value);
    setItems(parsed);
    setOrigItems(parsed);
    setDeletedIds(new Set());
  }, [value]);

  // Sync the "final" value (non-deleted items) to metadata
  const syncToMeta = (currentItems: CriteriaItem[], deleted: Set<string>) => {
    const finalValue = currentItems
      .filter((item) => !deleted.has(item.id))
      .map((item) => item.text)
      .filter((t) => t.trim())
      .join('\n');
    selfUpdate.current = true;
    onChange(metaKey, finalValue);
  };

  // Get status of an item
  const getStatus = (item: CriteriaItem): CriteriaStatus => {
    if (deletedIds.has(item.id)) return 'deleted';
    if (item.id.startsWith('crit-new-')) return 'new';
    const orig = origItems.find((o) => o.id === item.id);
    if (orig && orig.text !== item.text) return 'modified';
    return 'unchanged';
  };

  const updateItemText = (id: string, text: string) => {
    const updated = items.map((item) =>
      item.id === id ? { ...item, text } : item
    );
    setItems(updated);
    syncToMeta(updated, deletedIds);
  };

  const handleDelete = (id: string) => {
    if (id.startsWith('crit-new-')) {
      // New items can be removed outright
      const updated = items.filter((item) => item.id !== id);
      setItems(updated);
      syncToMeta(updated, deletedIds);
    } else {
      // Original items get marked as deleted
      const newDeleted = new Set(deletedIds);
      newDeleted.add(id);
      setDeletedIds(newDeleted);
      syncToMeta(items, newDeleted);
    }
  };

  const handleUndoDelete = (id: string) => {
    const newDeleted = new Set(deletedIds);
    newDeleted.delete(id);
    setDeletedIds(newDeleted);
    syncToMeta(items, newDeleted);
  };

  const handleAdd = () => {
    const newItem: CriteriaItem = { id: nextCriteriaId(), text: '' };
    const updated = [...items, newItem];
    setItems(updated);
  };

  return (
    <>
      <ul className="space-y-1">
        {items.map((item) => {
          const status = getStatus(item);
          const isDeleted = status === 'deleted';
          const orig = origItems.find((o) => o.id === item.id);

          return (
            <li key={item.id} className="group/item relative">
              <div className={`flex items-center gap-2 rounded px-1 py-0.5 transition-all ${
                status === 'new' || status === 'modified'
                  ? 'border border-dashed border-amber-400 bg-amber-50/50'
                  : isDeleted
                    ? 'border border-red-300 bg-red-50/50 opacity-60'
                    : ''
              }`}>
                <span className={`mt-0.5 h-1.5 w-1.5 flex-shrink-0 rounded-full ${isDeleted ? 'bg-red-400' : 'bg-secondary'}`} />

                <EditableInlineField
                  value={item.text}
                  onChangeValue={(v) => updateItemText(item.id, v)}
                  originalValue={orig?.text}
                  as="span"
                  className="flex-1 text-sm text-text-muted"
                  placeholder="Criteria item..."
                  disabled={isDeleted}
                />

                {isDeleted ? (
                  <button
                    onClick={() => handleUndoDelete(item.id)}
                    className="shrink-0 text-[10px] font-medium text-red-500 hover:text-red-700"
                  >
                    Undo
                  </button>
                ) : (
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="shrink-0 rounded p-0.5 text-gray-300 opacity-0 transition-opacity hover:text-red-500 group-hover/item:opacity-100"
                    title="Remove"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>

              {status === 'new' && <p className="ml-4 text-[9px] font-medium text-amber-600">New</p>}
              {status === 'modified' && <p className="ml-4 text-[9px] font-medium text-amber-600">Modified</p>}
              {status === 'deleted' && <p className="ml-4 text-[9px] font-medium text-red-500">Will be removed on save</p>}
            </li>
          );
        })}
      </ul>
      <button
        onClick={handleAdd}
        className="mt-3 flex items-center gap-1 text-xs font-medium text-gray-400 transition-colors hover:text-blue-500"
      >
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        Add criteria
      </button>
    </>
  );
}

// ============================================
// Editable industry sectors (edit only, no add/delete)
// ============================================

interface SectorItem {
  id: string;
  name: string;
  description: string;
  image: string | null;
  industry: IndustryRef | null;
}

function EditableIndustrySectors({ initialSectors, industries }: { initialSectors: IndustrySector[]; industries: IndustryRef[] }) {
  const { registerChanges, unregisterChanges } = useAdminPage();

  const [originalSectors, setOriginalSectors] = useState<SectorItem[]>(initialSectors);
  const [currentSectors, setCurrentSectors] = useState<SectorItem[]>(initialSectors);
  const [pickerTarget, setPickerTarget] = useState<string | null>(null);

  const currentRef = useRef(currentSectors);
  const originalRef = useRef(originalSectors);
  currentRef.current = currentSectors;
  originalRef.current = originalSectors;

  const sectorChanged = (a: SectorItem, b: SectorItem): boolean =>
    a.name !== b.name || a.description !== b.description || a.image !== b.image || a.industry?.id !== b.industry?.id;

  const isModified = (sector: SectorItem): boolean => {
    const orig = originalSectors.find((s) => s.id === sector.id);
    if (!orig) return false;
    return sectorChanged(sector, orig);
  };

  const computeDirtyCount = useCallback((): number => {
    let count = 0;
    for (const c of currentRef.current) {
      const o = originalRef.current.find((s) => s.id === c.id);
      if (o && sectorChanged(c, o)) count++;
    }
    return count;
  }, []);

  const saveSectors = useCallback(async () => {
    const orig = originalRef.current;
    const curr = currentRef.current;

    for (const c of curr) {
      const o = orig.find((s) => s.id === c.id);
      if (o && sectorChanged(c, o)) {
        const res = await authedApiFetch(`/api/admin/industry-sectors/${c.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: c.name,
            description: c.description,
            image: c.image,
            industryId: c.industry?.id ?? null,
          }),
        });
        if (!res.ok) throw new Error('Failed to update industry sector');
      }
    }

    setOriginalSectors([...currentRef.current]);
  }, []);

  const discardSectors = useCallback(() => {
    setCurrentSectors([...originalRef.current]);
  }, []);

  useEffect(() => {
    registerChanges('industrySectors', {
      count: computeDirtyCount(),
      save: saveSectors,
      discard: discardSectors,
    });
  }, [currentSectors, originalSectors, registerChanges, computeDirtyCount, saveSectors, discardSectors]);

  useEffect(() => {
    return () => unregisterChanges('industrySectors');
  }, [unregisterChanges]);

  const updateSectorField = (id: string, field: string, value: string) => {
    setCurrentSectors((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [field]: value } : s))
    );
  };

  const handleImageSelected = (s3Url: string) => {
    if (pickerTarget) {
      setCurrentSectors((prev) =>
        prev.map((s) => (s.id === pickerTarget ? { ...s, image: s3Url } : s))
      );
      setPickerTarget(null);
    }
  };

  const updateSectorIndustry = (sectorId: string, industryId: string) => {
    const industry = industryId ? industries.find((i) => i.id === industryId) ?? null : null;
    setCurrentSectors((prev) =>
      prev.map((s) => (s.id === sectorId ? { ...s, industry } : s))
    );
  };

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        {currentSectors.map((sector) => {
          const modified = isModified(sector);
          const orig = originalSectors.find((s) => s.id === sector.id);
          const displayImage = sector.image ? toAssetUrl(sector.image) || sector.image : null;

          return (
            <div
              key={sector.id}
              className={`group relative min-h-[240px] overflow-hidden rounded-lg ${
                modified ? 'ring-2 ring-dashed ring-amber-400' : ''
              }`}
            >
              {displayImage ? (
                <Image
                  src={displayImage}
                  alt={sector.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 100vw, 50vw"
                />
              ) : null}
              <div className="hero-gradient absolute inset-0" />
              <div className="relative flex h-full min-h-[240px] flex-col justify-end p-6">
                <EditableInlineField
                  value={sector.name}
                  onChangeValue={(v) => updateSectorField(sector.id, 'name', v)}
                  originalValue={orig?.name}
                  as="h4"
                  className="mb-1 text-lg font-semibold text-white"
                  placeholder="Sector name..."
                />

                <EditableInlineField
                  value={sector.description}
                  onChangeValue={(v) => updateSectorField(sector.id, 'description', v)}
                  originalValue={orig?.description}
                  as="p"
                  multiline
                  className="text-sm text-white/80"
                  placeholder="Description..."
                />

                {/* Industry link dropdown */}
                <select
                  value={sector.industry?.id ?? ''}
                  onChange={(e) => updateSectorIndustry(sector.id, e.target.value)}
                  className="mt-2 w-full rounded bg-white/20 px-2 py-1 text-xs text-white/90 backdrop-blur-sm [&>option]:text-gray-900"
                >
                  <option value="">No linked industry</option>
                  {industries.map((ind) => (
                    <option key={ind.id} value={ind.id}>{ind.name}</option>
                  ))}
                </select>

                {modified && <p className="mt-1 text-[9px] font-medium text-amber-300">Modified</p>}
              </div>

              {/* Image picker overlay */}
              <div
                className="absolute right-3 top-3 cursor-pointer opacity-0 transition-opacity group-hover:opacity-100"
                onClick={() => setPickerTarget(sector.id)}
              >
                <span className="rounded bg-white/90 px-2 py-1 text-xs font-medium text-gray-700">
                  {sector.image ? 'Change Image' : 'Add Image'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <AssetPickerModal
        isOpen={pickerTarget !== null}
        onClose={() => setPickerTarget(null)}
        onSelect={handleImageSelected}
        currentValue={pickerTarget ? currentSectors.find((s) => s.id === pickerTarget)?.image ?? undefined : undefined}
      />
    </>
  );
}

// ============================================
// Inner component (needs AdminPageContext)
// ============================================

// ============================================
// Editable core values (edit only, no add/delete)
// ============================================

interface CoreValueItem {
  id: string;
  title: string;
  description: string;
  icon: string;
}

function EditableCoreValues({ initialValues }: { initialValues: CoreValue[] }) {
  const { registerChanges, unregisterChanges } = useAdminPage();

  const [originalValues, setOriginalValues] = useState<CoreValueItem[]>(initialValues);
  const [currentValues, setCurrentValues] = useState<CoreValueItem[]>(initialValues);

  const currentRef = useRef(currentValues);
  const originalRef = useRef(originalValues);
  currentRef.current = currentValues;
  originalRef.current = originalValues;

  const isModified = (val: CoreValueItem): boolean => {
    const orig = originalValues.find((v) => v.id === val.id);
    if (!orig) return false;
    return orig.title !== val.title || orig.description !== val.description;
  };

  const computeDirtyCount = useCallback((): number => {
    let count = 0;
    for (const c of currentRef.current) {
      const o = originalRef.current.find((v) => v.id === c.id);
      if (o && (o.title !== c.title || o.description !== c.description)) count++;
    }
    return count;
  }, []);

  const saveValues = useCallback(async () => {
    const orig = originalRef.current;
    const curr = currentRef.current;

    for (const c of curr) {
      const o = orig.find((v) => v.id === c.id);
      if (o && (o.title !== c.title || o.description !== c.description)) {
        const res = await authedApiFetch(`/api/admin/core-values/${c.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: c.title, description: c.description }),
        });
        if (!res.ok) throw new Error('Failed to update core value');
      }
    }

    setOriginalValues([...currentRef.current]);
  }, []);

  const discardValues = useCallback(() => {
    setCurrentValues([...originalRef.current]);
  }, []);

  useEffect(() => {
    registerChanges('coreValues', {
      count: computeDirtyCount(),
      save: saveValues,
      discard: discardValues,
    });
  }, [currentValues, originalValues, registerChanges, computeDirtyCount, saveValues, discardValues]);

  useEffect(() => {
    return () => unregisterChanges('coreValues');
  }, [unregisterChanges]);

  const updateValueField = (id: string, field: string, val: string) => {
    setCurrentValues((prev) =>
      prev.map((v) => (v.id === id ? { ...v, [field]: val } : v))
    );
  };

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {currentValues.map((value) => {
        const modified = isModified(value);
        const orig = originalValues.find((v) => v.id === value.id);

        return (
          <div
            key={value.id}
            className={`flex flex-col items-center rounded-xl bg-white p-6 text-center shadow-sm transition-all ${
              modified
                ? 'border-2 border-dashed border-amber-400'
                : 'border border-border hover:border-secondary/30 hover:shadow-lg hover:shadow-primary/10'
            }`}
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

            <EditableInlineField
              value={value.title}
              onChangeValue={(v) => updateValueField(value.id, 'title', v)}
              originalValue={orig?.title}
              as="h3"
              className="mb-2 font-semibold text-primary"
              placeholder="Title..."
            />

            <EditableInlineField
              value={value.description}
              onChangeValue={(v) => updateValueField(value.id, 'description', v)}
              originalValue={orig?.description}
              as="p"
              multiline
              className="text-sm text-text-muted"
              placeholder="Description..."
            />

            {modified && <p className="mt-2 text-[9px] font-medium text-amber-600">Modified</p>}
          </div>
        );
      })}
    </div>
  );
}

// ============================================
// Inner component (needs AdminPageContext)
// ============================================

function AboutPageContent({
  industrySectors,
  coreValues,
  industries,
}: {
  industrySectors: IndustrySector[];
  coreValues: CoreValue[];
  industries: IndustryRef[];
}) {
  const { data, updateField, dirtyFields, saveStatus } = useAdminPage();
  const meta = data.metadata;

  // Track original content -- resets when save succeeds
  const [origContent, setOrigContent] = useState(data.content || '');
  useEffect(() => {
    if (saveStatus === 'success') {
      setOrigContent(data.content || '');
    }
  }, [saveStatus, data.content]);

  // Split content into paragraphs for per-paragraph editing
  const paragraphs = (data.content || '').split('\n\n').filter((p) => p.trim());
  const origParagraphs = origContent.split('\n\n').filter((p) => p.trim());

  const isParagraphDirty = (index: number): boolean => {
    if (index >= origParagraphs.length) return true;
    return paragraphs[index] !== origParagraphs[index];
  };

  const handleParagraphChange = (_key: string, value: string, index: number) => {
    const updated = [...paragraphs];
    updated[index] = value;
    updateField('content', updated.join('\n\n'));
  };

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
              {paragraphs.map((p, i) => (
                <EditableField
                  key={i}
                  fieldKey={`content-para-${i}`}
                  value={p}
                  onChange={(_key, value) => handleParagraphChange(_key, value, i)}
                  as="p"
                  className=""
                  isDirty={isParagraphDirty(i)}
                  placeholder="Paragraph text..."
                />
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
              <EditableCriteriaList
                metaKey="financialCriteria"
                value={meta.financialCriteria || ''}
                onChange={updateField}
              />
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
              <EditableCriteriaList
                metaKey="otherCriteria"
                value={meta.otherCriteria || ''}
                onChange={updateField}
              />
            </div>
          </div>

          {/* Industry Sectors */}
          <EditableField
            fieldKey="industrySectorsHeading"
            value={meta.industrySectorsHeading || 'Industry Sectors'}
            onChange={updateField}
            as="h3"
            className="mb-6 text-center text-xl font-semibold text-text"
            isDirty={dirtyFields.has('industrySectorsHeading')}
            placeholder="Heading..."
          />
          <EditableIndustrySectors initialSectors={industrySectors} industries={industries} />
        </div>
      </section>

      {/* Core Values */}
      <section className="bg-gradient-to-b from-surface to-surface-blue/30 py-16 md:py-24">
        <div className="container-max">
          <div className="mb-8 flex justify-center">
            <Image
              src="https://d1bjh7dvpwoxii.cloudfront.net/logos/fca-mountain-on-white.png"
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

          <EditableCoreValues initialValues={coreValues} />
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
  const [industries, setIndustries] = useState<IndustryRef[]>([]);
  const [coreValues, setCoreValues] = useState<CoreValue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [pageRes, buyRes, sellRes, stratRes, sectorsRes, valuesRes, industriesRes] =
          await Promise.all([
            authedApiFetch('/api/admin/pages/about'),
            fetch(`${API_URL}/service-offerings?category=buy-side&type=service`),
            fetch(`${API_URL}/service-offerings?category=sell-side&type=service`),
            fetch(`${API_URL}/service-offerings?category=strategic&type=service`),
            fetch(`${API_URL}/industry-sectors`),
            fetch(`${API_URL}/core-values`),
            fetch(`${API_URL}/industries`),
          ]);

        if (!pageRes.ok) throw new Error('Failed to fetch page data');

        const page = await pageRes.json();
        const buySide = buyRes.ok ? await buyRes.json() : [];
        const sellSide = sellRes.ok ? await sellRes.json() : [];
        const strategic = stratRes.ok ? await stratRes.json() : [];
        const sectors = sectorsRes.ok ? await sectorsRes.json() : [];
        const values = valuesRes.ok ? await valuesRes.json() : [];
        const allIndustries: IndustryRef[] = industriesRes.ok ? await industriesRes.json() : [];

        // Transform metadata to strings
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

        setBuySideServices(buySide);
        setSellSideServices(sellSide);
        setStrategicServices(strategic);
        setIndustrySectors(
          sectors.map((s: IndustrySector) => ({
            ...s,
            image: s.image ? toAssetUrl(s.image) || s.image : null,
          }))
        );
        setIndustries(allIndustries);

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
          industrySectors={industrySectors}
          coreValues={coreValues}
          industries={industries}
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
