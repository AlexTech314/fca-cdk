'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Catch-all for unmatched routes.
 * Redirects to DEFAULT_ROUTE based on the container type:
 *   - Public container: NEXT_PUBLIC_DEFAULT_ROUTE=/
 *   - Admin container:  NEXT_PUBLIC_DEFAULT_ROUTE=/admin
 */
export default function NotFound() {
  const router = useRouter();

  useEffect(() => {
    router.replace(process.env.NEXT_PUBLIC_DEFAULT_ROUTE || '/');
  }, [router]);

  return null;
}
