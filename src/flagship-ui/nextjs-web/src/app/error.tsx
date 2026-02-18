'use client';

const CautionIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    className="w-16 h-16 text-[var(--color-warning)]"
    aria-hidden
  >
    <path
      fillRule="evenodd"
      d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z"
      clipRule="evenodd"
    />
  </svg>
);

export default function Error({
  error: _error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="max-w-lg flex flex-col items-center">
        <CautionIcon />
        <h1 className="text-2xl font-semibold text-primary mt-6 mb-4">
          We are having some technical difficulties
        </h1>
        <p className="text-text-muted mb-8">
          We are hard at work fixing them. Please come back later.
        </p>
        <button
          onClick={reset}
          className="px-6 py-3 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors font-medium"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
