'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

function getReferrerSource(): string {
  if (typeof document === 'undefined' || !document.referrer) return 'direct';
  try {
    const ref = new URL(document.referrer);
    if (ref.origin === window.location.origin) return 'same';
    return ref.hostname;
  } catch {
    return 'direct';
  }
}

export function PageViewTracker() {
  const pathname = usePathname();
  const isFirstLoad = useRef(true);

  useEffect(() => {
    const referrer = isFirstLoad.current ? getReferrerSource() : 'same';
    isFirstLoad.current = false;

    fetch(`${API_URL}/analytics/pageview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: pathname, referrer }),
    }).catch(() => {});
  }, [pathname]);

  return null;
}
