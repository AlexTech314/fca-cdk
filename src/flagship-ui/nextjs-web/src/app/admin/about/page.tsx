'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const editRef = useRef<HTMLInputElement>(null);

  // Track whether we triggered the value change ourselves
  const selfUpdate = useRef(false);

  // Re-initialize on save success (value may not change but local state needs resetting)
  useEffect(() => {
    if (saveStatus === 'success') {
      const parsed = parseCriteria(value);
      setItems(parsed);
      setOrigItems(parsed);
      setDeletedIds(new Set());
      setEditingId(null);
    }
  }, [saveStatus, value]);

  // Detect external changes (discard) by watching the metadata value
  useEffect(() => {
    if (selfUpdate.current) {
      selfUpdate.current = false;
      return;
    }
    // Value changed externally -- re-initialize
    const parsed = parseCriteria(value);
    setItems(parsed);
    setOrigItems(parsed);
    setDeletedIds(new Set());
    setEditingId(null);
  }, [value]);

  useEffect(() => {
    if (editingId && editRef.current) {
      editRef.current.focus();
      editRef.current.select();
    }
  }, [editingId]);

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

  const commitEdit = () => {
    if (editingId && editText.trim()) {
      const updated = items.map((item) =>
        item.id === editingId ? { ...item, text: editText.trim() } : item
      );
      setItems(updated);
      syncToMeta(updated, deletedIds);
    }
    setEditingId(null);
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
    if (editingId === id) setEditingId(null);
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
    // Don't sync yet -- empty text would be filtered out. Sync on commit.
    setEditingId(newItem.id);
    setEditText('');
  };

  return (
    <>
      <ul className="space-y-1">
        {items.map((item) => {
          const status = getStatus(item);
          const isDeleted = status === 'deleted';
          const isEditing = editingId === item.id;

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

                {isEditing ? (
                  <input
                    ref={editRef}
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    onBlur={commitEdit}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commitEdit();
                      if (e.key === 'Escape') setEditingId(null);
                    }}
                    className="flex-1 rounded border border-blue-400 bg-white px-1 py-0 text-sm text-text-muted outline-none focus:ring-1 focus:ring-blue-400"
                    placeholder="Criteria item..."
                  />
                ) : isDeleted ? (
                  <span className="flex-1 text-sm text-text-muted line-through">
                    {item.text}
                  </span>
                ) : (
                  <span
                    onClick={() => { setEditingId(item.id); setEditText(item.text); }}
                    className="flex-1 cursor-pointer text-sm text-text-muted hover:text-primary"
                  >
                    {item.text || '(empty)'}
                  </span>
                )}

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
}

function EditableIndustrySectors({ initialSectors }: { initialSectors: IndustrySector[] }) {
  const { registerChanges, unregisterChanges } = useAdminPage();

  const [originalSectors, setOriginalSectors] = useState<SectorItem[]>(initialSectors);
  const [currentSectors, setCurrentSectors] = useState<SectorItem[]>(initialSectors);
  const [editingField, setEditingField] = useState<{ id: string; field: 'name' | 'description' } | null>(null);
  const [editText, setEditText] = useState('');
  const editRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  const currentRef = useRef(currentSectors);
  const originalRef = useRef(originalSectors);
  currentRef.current = currentSectors;
  originalRef.current = originalSectors;

  useEffect(() => {
    if (editingField && editRef.current) {
      editRef.current.focus();
      editRef.current.select();
    }
  }, [editingField]);

  const isModified = (sector: SectorItem): boolean => {
    const orig = originalSectors.find((s) => s.id === sector.id);
    if (!orig) return false;
    return orig.name !== sector.name || orig.description !== sector.description;
  };

  const computeDirtyCount = useCallback((): number => {
    let count = 0;
    for (const c of currentRef.current) {
      const o = originalRef.current.find((s) => s.id === c.id);
      if (o && (o.name !== c.name || o.description !== c.description)) count++;
    }
    return count;
  }, []);

  const saveSectors = useCallback(async () => {
    const orig = originalRef.current;
    const curr = currentRef.current;

    for (const c of curr) {
      const o = orig.find((s) => s.id === c.id);
      if (o && (o.name !== c.name || o.description !== c.description)) {
        const res = await fetch(`/api/admin/industry-sectors/${c.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: c.name, description: c.description }),
        });
        if (!res.ok) throw new Error('Failed to update industry sector');
      }
    }

    setOriginalSectors([...currentRef.current]);
  }, []);

  const discardSectors = useCallback(() => {
    setCurrentSectors([...originalRef.current]);
    setEditingField(null);
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

  const commitEdit = () => {
    if (editingField && editText.trim()) {
      setCurrentSectors((prev) =>
        prev.map((s) =>
          s.id === editingField.id ? { ...s, [editingField.field]: editText.trim() } : s
        )
      );
    }
    setEditingField(null);
  };

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {currentSectors.map((sector) => {
        const modified = isModified(sector);

        return (
          <div
            key={sector.id}
            className={`rounded-lg bg-surface p-5 transition-all ${
              modified ? 'border-2 border-dashed border-amber-400' : 'border border-border'
            }`}
          >
            {/* Name */}
            {editingField?.id === sector.id && editingField.field === 'name' ? (
              <input
                ref={editRef as React.RefObject<HTMLInputElement>}
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                onBlur={commitEdit}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitEdit();
                  if (e.key === 'Escape') setEditingField(null);
                }}
                className="mb-2 w-full rounded border border-blue-400 bg-white px-1 py-0.5 font-semibold text-primary outline-none focus:ring-1 focus:ring-blue-400"
              />
            ) : (
              <h4
                onClick={() => { setEditingField({ id: sector.id, field: 'name' }); setEditText(sector.name); }}
                className="mb-2 cursor-pointer font-semibold text-primary hover:text-primary/70"
              >
                {sector.name}
              </h4>
            )}

            {/* Description */}
            {editingField?.id === sector.id && editingField.field === 'description' ? (
              <textarea
                ref={editRef as React.RefObject<HTMLTextAreaElement>}
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                onBlur={commitEdit}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setEditingField(null);
                }}
                rows={3}
                className="w-full rounded border border-blue-400 bg-white px-1 py-0.5 text-sm text-text-muted outline-none focus:ring-1 focus:ring-blue-400"
              />
            ) : (
              <p
                onClick={() => { setEditingField({ id: sector.id, field: 'description' }); setEditText(sector.description); }}
                className="cursor-pointer text-sm text-text-muted hover:text-text"
              >
                {sector.description}
              </p>
            )}

            {modified && <p className="mt-1 text-[9px] font-medium text-amber-600">Modified</p>}
          </div>
        );
      })}
    </div>
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
  const [editingField, setEditingField] = useState<{ id: string; field: 'title' | 'description' } | null>(null);
  const [editText, setEditText] = useState('');
  const editRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  const currentRef = useRef(currentValues);
  const originalRef = useRef(originalValues);
  currentRef.current = currentValues;
  originalRef.current = originalValues;

  useEffect(() => {
    if (editingField && editRef.current) {
      editRef.current.focus();
      editRef.current.select();
    }
  }, [editingField]);

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
        const res = await fetch(`/api/admin/core-values/${c.id}`, {
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
    setEditingField(null);
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

  const commitEdit = () => {
    if (editingField && editText.trim()) {
      setCurrentValues((prev) =>
        prev.map((v) =>
          v.id === editingField.id ? { ...v, [editingField.field]: editText.trim() } : v
        )
      );
    }
    setEditingField(null);
  };

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {currentValues.map((value) => {
        const modified = isModified(value);

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

            {/* Editable title */}
            {editingField?.id === value.id && editingField.field === 'title' ? (
              <input
                ref={editRef as React.RefObject<HTMLInputElement>}
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                onBlur={commitEdit}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitEdit();
                  if (e.key === 'Escape') setEditingField(null);
                }}
                className="mb-2 w-full rounded border border-blue-400 bg-white px-1 py-0.5 text-center font-semibold text-primary outline-none focus:ring-1 focus:ring-blue-400"
              />
            ) : (
              <h3
                onClick={() => { setEditingField({ id: value.id, field: 'title' }); setEditText(value.title); }}
                className="mb-2 cursor-pointer font-semibold text-primary hover:text-primary/70"
              >
                {value.title}
              </h3>
            )}

            {/* Editable description */}
            {editingField?.id === value.id && editingField.field === 'description' ? (
              <textarea
                ref={editRef as React.RefObject<HTMLTextAreaElement>}
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                onBlur={commitEdit}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setEditingField(null);
                }}
                rows={3}
                className="w-full rounded border border-blue-400 bg-white px-1 py-0.5 text-center text-sm text-text-muted outline-none focus:ring-1 focus:ring-blue-400"
              />
            ) : (
              <p
                onClick={() => { setEditingField({ id: value.id, field: 'description' }); setEditText(value.description); }}
                className="cursor-pointer text-sm text-text-muted hover:text-text"
              >
                {value.description}
              </p>
            )}

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
}: {
  industrySectors: IndustrySector[];
  coreValues: CoreValue[];
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
          <EditableIndustrySectors initialSectors={industrySectors} />
        </div>
      </section>

      {/* Core Values */}
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
