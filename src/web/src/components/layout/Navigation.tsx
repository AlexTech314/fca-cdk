'use client';

import { useState } from 'react';
import Link from 'next/link';
import { navItems } from '@/lib/utils';

export function Navigation() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="lg:hidden">
      {/* Hamburger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center justify-center rounded-md p-2 text-text-muted hover:bg-surface hover:text-primary focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary"
        aria-expanded={isOpen}
        aria-label="Toggle navigation menu"
      >
        <span className="sr-only">Open main menu</span>
        {isOpen ? (
          <svg
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="1.5"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        ) : (
          <svg
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="1.5"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
            />
          </svg>
        )}
      </button>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-16 z-50 border-b border-border bg-white shadow-lg md:top-20">
          <nav className="container-max py-4">
            <div className="flex flex-col space-y-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className="rounded-md px-4 py-3 text-base font-medium text-text-muted transition-colors hover:bg-surface hover:text-primary"
                >
                  {item.name}
                </Link>
              ))}
              <div className="pt-2">
                <Link
                  href="/contact"
                  onClick={() => setIsOpen(false)}
                  className="block rounded-md px-4 py-3 text-center text-base font-medium transition-colors hover:opacity-90"
                  style={{ backgroundColor: '#1e3a5f', color: '#ffffff' }}
                >
                  Get Started
                </Link>
              </div>
            </div>
          </nav>
        </div>
      )}
    </div>
  );
}
