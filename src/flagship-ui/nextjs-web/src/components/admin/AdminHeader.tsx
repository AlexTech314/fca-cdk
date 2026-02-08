'use client';

import Image from 'next/image';
import Link from 'next/link';

export function AdminHeader() {
  return (
    <header
      className="sticky top-0 z-50 w-full border-b border-white/10 shadow-sm"
      style={{
        background: 'linear-gradient(to right, #0f2744, #1e3a5f)',
      }}
    >
      <div className="flex h-14 items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <Link href="/admin" className="flex items-center gap-3">
            <Image
              src="https://fca-assets-113862367661.s3.us-east-2.amazonaws.com/logos/fca-mountain-on-white.png"
              alt="FCA"
              width={100}
              height={35}
              className="h-7 w-auto brightness-0 invert"
              priority
            />
            <div className="hidden items-center gap-2 sm:flex">
              <span className="text-sm font-semibold text-white">
                Flatirons Capital
              </span>
              <span className="text-xs text-white/50">|</span>
              <span className="text-xs font-medium text-white/80">
                Admin Dashboard
              </span>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md px-3 py-1.5 text-xs font-medium transition-colors"
            style={{
              color: '#ffffff',
              border: '1px solid rgba(255,255,255,0.3)',
            }}
          >
            View Live Site
          </a>
        </div>
      </div>
    </header>
  );
}
