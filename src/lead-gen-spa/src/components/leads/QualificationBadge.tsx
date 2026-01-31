import { cn } from '@/lib/utils';

interface QualificationBadgeProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
}

export function QualificationBadge({ score, size = 'md' }: QualificationBadgeProps) {
  const getColor = (score: number) => {
    if (score >= 80) return 'bg-success text-white';
    if (score >= 60) return 'bg-warning text-black';
    return 'bg-destructive text-white';
  };

  const getSize = (size: 'sm' | 'md' | 'lg') => {
    switch (size) {
      case 'sm':
        return 'h-6 w-6 text-xs';
      case 'lg':
        return 'h-12 w-12 text-lg';
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
      {score}
    </div>
  );
}
