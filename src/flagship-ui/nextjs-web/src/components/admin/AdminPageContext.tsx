'use client';

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';

interface PageData {
  title: string;
  metadata: Record<string, string>;
}

type SaveStatus = 'idle' | 'saving' | 'success' | 'error';

interface AdminPageContextValue {
  /** Current page data (with local edits applied) */
  data: PageData;
  /** Update a field value (use 'title' key for top-level title, anything else for metadata) */
  updateField: (key: string, value: string) => void;
  /** Save all changes to the API */
  save: () => Promise<void>;
  /** Discard all changes and revert to original */
  discard: () => void;
  /** Whether there are unsaved changes */
  isDirty: boolean;
  /** Number of dirty fields */
  dirtyCount: number;
  /** Set of field keys that have been modified */
  dirtyFields: Set<string>;
  /** Current save status */
  saveStatus: SaveStatus;
  /** Error message from last save attempt */
  saveError: string | null;
}

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

  const updateField = useCallback(
    (key: string, value: string) => {
      setCurrentData((prev) => {
        if (key === 'title') {
          return { ...prev, title: value };
        }
        return {
          ...prev,
          metadata: { ...prev.metadata, [key]: value },
        };
      });

      // Check if the value differs from the original
      const originalValue =
        key === 'title'
          ? originalData.title
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

      // Reset save status when editing
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
      const response = await fetch(`/api/admin/pages/${pageKey}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: currentData.title,
          metadata: currentData.metadata,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Save failed: ${response.status}`);
      }

      // Update original data to match current
      setOriginalData({ ...currentData });
      setDirtyFields(new Set());
      setSaveStatus('success');

      // Reset success status after 3 seconds
      setTimeout(() => {
        setSaveStatus((prev) => (prev === 'success' ? 'idle' : prev));
      }, 3000);
    } catch (error) {
      setSaveStatus('error');
      setSaveError(
        error instanceof Error ? error.message : 'An error occurred'
      );
    }
  }, [pageKey, currentData]);

  const discard = useCallback(() => {
    setCurrentData({ ...originalData });
    setDirtyFields(new Set());
    setSaveStatus('idle');
    setSaveError(null);
  }, [originalData]);

  const isDirty = dirtyFields.size > 0;
  const dirtyCount = dirtyFields.size;

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
