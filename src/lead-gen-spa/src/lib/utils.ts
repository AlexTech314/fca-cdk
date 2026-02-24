import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US').format(num)
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(date))
}

export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(date))
}

export function formatRelativeTime(date: string | Date): string {
  const now = new Date()
  const then = new Date(date)
  const diffMs = now.getTime() - then.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`
  return formatDate(date)
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 15)
}

/** Take top N items by value and group the rest into "Other" with combined percentage. */
export function topNWithOther<T extends { name: string; value: number; percentage?: number }>(
  items: T[] | undefined,
  n = 9,
): T[] {
  if (!items?.length) return items ?? [];
  const sorted = [...items].sort((a, b) => b.value - a.value);
  if (sorted.length <= n) return sorted;
  const top = sorted.slice(0, n);
  const rest = sorted.slice(n);
  const otherTotal = rest.reduce((sum, item) => sum + item.value, 0);
  if (otherTotal === 0) return top;
  const total = sorted.reduce((sum, item) => sum + item.value, 0);
  const otherPercentage = total > 0 ? Math.round((otherTotal / total) * 100) : 0;
  return [
    ...top,
    { name: 'Other', value: otherTotal, percentage: otherPercentage } as T,
  ];
}
