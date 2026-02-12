'use client';

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from 'react';
import { useRouter, usePathname } from 'next/navigation';

// ============================================
// TYPES
// ============================================

interface Guard {
  isDirty: boolean;
  save: () => Promise<void>;
  discard: () => void;
}

interface UnsavedChangesContextValue {
  /** Register a navigation guard (called by AdminPageProvider) */
  registerGuard: (guard: Guard) => void;
  /** Unregister the guard (called on page unmount) */
  unregisterGuard: () => void;
  /** Request navigation -- shows modal if dirty, navigates directly otherwise */
  requestNavigation: (href: string) => void;
  /** Whether the modal is currently shown */
  isModalOpen: boolean;
  /** The href the user wants to navigate to */
  pendingHref: string | null;
  /** Current page name for "Back to X" label */
  currentPageName: string;
  /** Close the modal (stay on page) */
  closeModal: () => void;
  /** Discard changes and navigate */
  discardAndNavigate: () => void;
  /** Save changes and navigate */
  saveAndNavigate: () => Promise<void>;
  /** Whether a save is in progress */
  isSaving: boolean;
}

// ============================================
// PAGE NAME MAPPING
// ============================================

const pageNameMap: Record<string, string> = {
  '/admin': 'Home',
  '/admin/about': 'About',
  '/admin/team': 'Team',
  '/admin/transactions': 'Transactions',
  '/admin/news': 'News',
  '/admin/resources': 'Resources',
  '/admin/faq': 'FAQ',
  '/admin/contact': 'Contact',
  '/admin/assets/photos': 'Images',
  '/admin/assets/files': 'Files',
};

// ============================================
// CONTEXT
// ============================================

const UnsavedChangesContext = createContext<UnsavedChangesContextValue | null>(null);

export function UnsavedChangesProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const guardRef = useRef<Guard | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const currentPageName = pageNameMap[pathname] || 'this page';

  const registerGuard = useCallback((guard: Guard) => {
    guardRef.current = guard;
  }, []);

  const unregisterGuard = useCallback(() => {
    guardRef.current = null;
  }, []);

  const requestNavigation = useCallback(
    (href: string) => {
      // If already on that page, do nothing
      if (href === pathname) return;

      // If no guard or not dirty, navigate directly
      if (!guardRef.current || !guardRef.current.isDirty) {
        router.push(href);
        return;
      }

      // Show the modal
      setPendingHref(href);
      setIsModalOpen(true);
    },
    [pathname, router]
  );

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setPendingHref(null);
    setIsSaving(false);
  }, []);

  const discardAndNavigate = useCallback(() => {
    if (guardRef.current) {
      guardRef.current.discard();
    }
    const href = pendingHref;
    setIsModalOpen(false);
    setPendingHref(null);
    if (href) {
      router.push(href);
    }
  }, [pendingHref, router]);

  const saveAndNavigate = useCallback(async () => {
    if (!guardRef.current) return;

    setIsSaving(true);
    try {
      await guardRef.current.save();
      const href = pendingHref;
      setIsModalOpen(false);
      setPendingHref(null);
      setIsSaving(false);
      if (href) {
        router.push(href);
      }
    } catch {
      // Save failed -- keep modal open so user can try again or discard
      setIsSaving(false);
    }
  }, [pendingHref, router]);

  // beforeunload handler for browser refresh/close
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (guardRef.current?.isDirty) {
        e.preventDefault();
      }
    };

    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  const value: UnsavedChangesContextValue = {
    registerGuard,
    unregisterGuard,
    requestNavigation,
    isModalOpen,
    pendingHref,
    currentPageName,
    closeModal,
    discardAndNavigate,
    saveAndNavigate,
    isSaving,
  };

  return (
    <UnsavedChangesContext.Provider value={value}>
      {children}
    </UnsavedChangesContext.Provider>
  );
}

export function useUnsavedChanges() {
  const context = useContext(UnsavedChangesContext);
  if (!context) {
    throw new Error('useUnsavedChanges must be used within UnsavedChangesProvider');
  }
  return context;
}
