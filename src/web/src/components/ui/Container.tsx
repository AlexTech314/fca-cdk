import { cn } from '@/lib/utils';

interface ContainerProps {
  children: React.ReactNode;
  className?: string;
  as?: 'div' | 'section' | 'article' | 'main' | 'aside' | 'header' | 'footer' | 'nav';
}

export function Container({
  children,
  className,
  as: Component = 'div',
}: ContainerProps) {
  return (
    <Component className={cn('container-max', className)}>
      {children}
    </Component>
  );
}
