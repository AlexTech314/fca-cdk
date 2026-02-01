'use client';

import { useState } from 'react';

interface ExpandBioButtonProps {
  name: string;
  title: string;
  bio: string;
  email?: string;
  linkedIn?: string;
}

export function ExpandBioButton({ name, title, bio, email, linkedIn }: ExpandBioButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Expand button */}
      <button
        onClick={() => setIsOpen(true)}
        className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-lg bg-white/90 text-text-muted opacity-0 shadow-sm backdrop-blur-sm transition-all hover:bg-white hover:text-primary group-hover:opacity-100"
        title="View full bio"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
        </svg>
      </button>

      {/* Dialog - only renders when open */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => setIsOpen(false)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          
          {/* Dialog */}
          <div 
            className="relative max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setIsOpen(false)}
              className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-surface text-text-muted transition-colors hover:bg-border hover:text-text"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Content */}
            <div className="max-h-[90vh] overflow-y-auto p-6 sm:p-8">
              <h2 className="text-2xl font-bold text-primary">{name}</h2>
              <p className="text-lg text-secondary">{title}</p>
              
              <div className="mt-6 space-y-4 text-text-muted">
                {bio.split('\n\n').map((paragraph, i) => (
                  <p key={i}>{paragraph}</p>
                ))}
              </div>

              {/* Contact links */}
              {(email || linkedIn) && (
                <div className="mt-6 flex items-center gap-4 border-t border-border pt-6">
                  {email && (
                    <a
                      href={`mailto:${email}`}
                      className="inline-flex items-center gap-2 text-sm font-medium text-secondary transition-colors hover:text-primary"
                    >
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                      </svg>
                      Email
                    </a>
                  )}
                  {linkedIn && (
                    <a
                      href={linkedIn}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm font-medium text-secondary transition-colors hover:text-primary"
                    >
                      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                      </svg>
                      LinkedIn
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
