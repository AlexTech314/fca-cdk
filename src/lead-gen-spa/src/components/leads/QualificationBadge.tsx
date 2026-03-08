import { cn } from '@/lib/utils';

interface ScoreBadgeProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
}

/** Circular badge for 0-1000 scores. Gray for low, amber for mid, green for high. -1 = N/A. */
export function ScoreBadge({ score, size = 'md' }: ScoreBadgeProps) {
  const isNA = score === -1;

  const getColor = (s: number) => {
    if (isNA) return 'bg-muted text-muted-foreground';
    if (s >= 800) return 'bg-green-600 text-white';
    if (s >= 600) return 'bg-amber-500 text-white';
    if (s >= 400) return 'bg-orange-400 text-white';
    return 'bg-gray-400 text-white';
  };

  const getSize = (s: 'sm' | 'md' | 'lg') => {
    switch (s) {
      case 'sm':
        return 'h-6 min-w-6 px-1 text-xs';
      case 'lg':
        return 'h-10 min-w-10 px-1.5 text-base';
      default:
        return 'h-8 min-w-8 px-1 text-sm';
    }
  };

  return (
    <div
      className={cn(
        'inline-flex items-center justify-center rounded-full font-mono font-bold',
        getColor(score),
        getSize(size)
      )}
    >
      {isNA ? '—' : score}
    </div>
  );
}
