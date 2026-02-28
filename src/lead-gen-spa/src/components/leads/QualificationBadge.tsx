import { cn } from '@/lib/utils';

interface ScoreBadgeProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
}

/** Circular badge for 1-10 scores. Gray for low, amber for mid, green for high. -1 = N/A. */
export function ScoreBadge({ score, size = 'md' }: ScoreBadgeProps) {
  const isNA = score === -1;

  const getColor = (s: number) => {
    if (isNA) return 'bg-muted text-muted-foreground';
    if (s >= 8) return 'bg-green-600 text-white';
    if (s >= 6) return 'bg-amber-500 text-white';
    if (s >= 4) return 'bg-orange-400 text-white';
    return 'bg-gray-400 text-white';
  };

  const getSize = (s: 'sm' | 'md' | 'lg') => {
    switch (s) {
      case 'sm':
        return 'h-6 w-6 text-xs';
      case 'lg':
        return 'h-10 w-10 text-base';
      default:
        return 'h-8 w-8 text-sm';
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
