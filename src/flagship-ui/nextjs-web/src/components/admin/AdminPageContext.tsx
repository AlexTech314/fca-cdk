'use client';

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from 'react';
import { useUnsavedChanges } from './UnsavedChangesContext';

// ============================================
// TYPES
// ============================================

interface PageData {
  title: string;
  content?: string;
  metadata: Record<string, string>;
}

type SaveStatus = 'idle' | 'saving' | 'success' | 'error';

/**
 * A change set registered by any child component (awards, team members, etc.)
 * that participates in the unified save/discard flow.
 */
export interface ChangeSet {
  /** Number of pending changes */
  count: number;
  /** Flush pending changes to the API */
  save: () => Promise<void>;
  /** Revert to original state */
  discard: () => void;
}

interface AdminPageContextValue {
  /** Current page data (with local edits applied) */
  data: PageData;
  /** Update a field value (use 'title' key for top-level title, anything else for metadata) */
  updateField: (key: string, value: string) => void;
  /** Save all changes (page data + all registered change sets) */
  save: () => Promise<void>;
  /** Discard all changes (page data + all registered change sets) */
  discard: () => void;
  /** Whether there are any unsaved changes */
  isDirty: boolean;
  /** Total number of unsaved changes */
  dirtyCount: number;
  /** Set of page field keys that have been modified */
  dirtyFields: Set<string>;
  /** Current save status */
  saveStatus: SaveStatus;
  /** Error message from last save attempt */
  saveError: string | null;
  /** Register a named change set (awards, team members, etc.) */
  registerChanges: (key: string, changes: ChangeSet) => void;
  /** Unregister a change set (call on unmount) */
  unregisterChanges: (key: string) => void;
}

// ============================================
// CONTEXT
// ============================================

const AdminPageContext = createContext<AdminPageContextValue | null>(null);

interface AdminPageProviderProps {
  children: ReactNode;
  /** The page key (e.g., 'home') used for the API endpoint */
  pageKey: string;
  /** Initial page data from the API */
  initialData: PageData;
}

export function AdminPageProvider({
  children,
  pageKey,
  initialData,
}: AdminPageProviderProps) {
  const [originalData, setOriginalData] = useState<PageData>(initialData);
  const [currentData, setCurrentData] = useState<PageData>(initialData);
  const [dirtyFields, setDirtyFields] = useState<Set<string>>(new Set());
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);

  // Change registry: any child component can register pending changes
  const [changeSets, setChangeSets] = useState<Map<string, ChangeSet>>(new Map());
  const changeSetsRef = useRef(changeSets);
  changeSetsRef.current = changeSets;

  const registerChanges = useCallback((key: string, changes: ChangeSet) => {
    setChangeSets((prev) => {
      const next = new Map(prev);
      next.set(key, changes);
      return next;
    });
  }, []);

  const unregisterChanges = useCallback((key: string) => {
    setChangeSets((prev) => {
      const next = new Map(prev);
      next.delete(key);
      return next;
    });
  }, []);

  // Aggregate dirty counts from page fields + all registered change sets
  const registeredDirtyCount = useMemo(() => {
    let total = 0;
    for (const cs of changeSets.values()) {
      total += cs.count;
    }
    return total;
  }, [changeSets]);

  const updateField = useCallback(
    (key: string, value: string) => {
      setCurrentData((prev) => {
        if (key === 'title') {
          return { ...prev, title: value };
        }
        if (key === 'content') {
          return { ...prev, content: value };
        }
        return {
          ...prev,
          metadata: { ...prev.metadata, [key]: value },
        };
      });

      const originalValue =
        key === 'title'
          ? originalData.title
          : key === 'content'
            ? originalData.content || ''
            : originalData.metadata[key] || '';

      setDirtyFields((prev) => {
        const next = new Set(prev);
        if (value !== originalValue) {
          next.add(key);
        } else {
          next.delete(key);
        }
        return next;
      });

      if (saveStatus === 'success' || saveStatus === 'error') {
        setSaveStatus('idle');
        setSaveError(null);
      }
    },
    [originalData, saveStatus]
  );

  const save = useCallback(async () => {
    setSaveStatus('saving');
    setSaveError(null);

    try {
      // Save page data
      if (dirtyFields.size > 0) {
        const response = await fetch(`/api/admin/pages/${pageKey}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: currentData.title,
            content: currentData.content ?? '',
            metadata: currentData.metadata,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `Save failed: ${response.status}`);
        }

        setOriginalData({ ...currentData });
        setDirtyFields(new Set());
      }

      // Save all registered change sets
      const sets = Array.from(changeSetsRef.current.values());
      for (const cs of sets) {
        if (cs.count > 0) {
          await cs.save();
        }
      }

      setSaveStatus('success');
      setTimeout(() => {
        setSaveStatus((prev) => (prev === 'success' ? 'idle' : prev));
      }, 3000);
    } catch (error) {
      setSaveStatus('error');
      setSaveError(
        error instanceof Error ? error.message : 'An error occurred'
      );
    }
  }, [pageKey, currentData, dirtyFields]);

  const discard = useCallback(() => {
    // Discard page data
    setCurrentData({ ...originalData });
    setDirtyFields(new Set());
    setSaveStatus('idle');
    setSaveError(null);

    // Discard all registered change sets
    for (const cs of changeSetsRef.current.values()) {
      cs.discard();
    }
  }, [originalData]);

  const isDirty = dirtyFields.size > 0 || registeredDirtyCount > 0;
  const dirtyCount = dirtyFields.size + registeredDirtyCount;

  // Register with the unsaved changes navigation guard
  const { registerGuard, unregisterGuard } = useUnsavedChanges();

  useEffect(() => {
    registerGuard({ isDirty, save, discard });
  }, [isDirty, save, discard, registerGuard]);

  useEffect(() => {
    return () => unregisterGuard();
  }, [unregisterGuard]);

  const value = useMemo<AdminPageContextValue>(
    () => ({
      data: currentData,
      updateField,
      save,
      discard,
      isDirty,
      dirtyCount,
      dirtyFields,
      saveStatus,
      saveError,
      registerChanges,
      unregisterChanges,
    }),
    [
      currentData,
      updateField,
      save,
      discard,
      isDirty,
      dirtyCount,
      dirtyFields,
      saveStatus,
      saveError,
      registerChanges,
      unregisterChanges,
    ]
  );

  return (
    <AdminPageContext.Provider value={value}>
      {children}
    </AdminPageContext.Provider>
  );
}

export function useAdminPage() {
  const context = useContext(AdminPageContext);
  if (!context) {
    throw new Error('useAdminPage must be used within an AdminPageProvider');
  }
  return context;
}
