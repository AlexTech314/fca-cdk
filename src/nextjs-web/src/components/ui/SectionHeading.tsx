import { cn } from '@/lib/utils';

interface SectionHeadingProps {
  title: string;
  subtitle?: string;
  description?: string;
  align?: 'left' | 'center';
  className?: string;
}

export function SectionHeading({
  title,
  subtitle,
  description,
  align = 'center',
  className,
}: SectionHeadingProps) {
  return (
    <div
      className={cn(
        'mb-12',
        align === 'center' && 'text-center',
        className
      )}
    >
      {subtitle && (
        <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-secondary">
          {subtitle}
        </p>
      )}
      <h2 className="text-3xl font-bold text-primary md:text-4xl">{title}</h2>
      {description && (
        <p
          className={cn(
            'mt-4 text-lg text-text-muted',
            align === 'center' && 'mx-auto max-w-2xl'
          )}
        >
          {description}
        </p>
      )}
    </div>
  );
}
