'use client';

import { useAdminPage } from './AdminPageContext';

export function SaveBar() {
  const { isDirty, dirtyCount, save, discard, saveStatus, saveError } =
    useAdminPage();

  if (!isDirty && saveStatus !== 'success' && saveStatus !== 'error') {
    return null;
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-white shadow-lg">
      <div className="container-max flex items-center justify-between py-3">
        <div className="flex items-center gap-3">
          {saveStatus === 'success' ? (
            <>
              <div className="h-2 w-2 rounded-full bg-green-500" />
              <span className="text-sm font-medium text-green-700">
                Changes saved successfully
              </span>
            </>
          ) : saveStatus === 'error' ? (
            <>
              <div className="h-2 w-2 rounded-full bg-red-500" />
              <span className="text-sm font-medium text-red-700">
                {saveError || 'Failed to save changes'}
              </span>
            </>
          ) : (
            <>
              <div className="h-2 w-2 rounded-full bg-amber-500" />
              <span className="text-sm font-medium text-text">
                {dirtyCount} unsaved {dirtyCount === 1 ? 'change' : 'changes'}
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-3">
          {isDirty && (
            <>
              <button
                type="button"
                onClick={discard}
                disabled={saveStatus === 'saving'}
                className="rounded-md border border-border px-4 py-2 text-sm font-medium text-text-muted transition-colors hover:bg-surface disabled:opacity-50"
              >
                Discard
              </button>
              <button
                type="button"
                onClick={save}
                disabled={saveStatus === 'saving'}
                className="inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium text-white transition-colors hover:brightness-110 disabled:opacity-50"
                style={{
                  background:
                    'linear-gradient(to right, #1e3a5f, #2d4a6f)',
                }}
              >
                {saveStatus === 'saving' ? (
                  <>
                    <svg
                      className="h-4 w-4 animate-spin"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
