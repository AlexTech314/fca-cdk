import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface HeaderProps {
  breadcrumbs?: BreadcrumbItem[];
  actions?: ReactNode;
  className?: string;
}

export function Header({ breadcrumbs, actions, className }: HeaderProps) {
  if (!breadcrumbs?.length && !actions) {
    return null;
  }

  return (
    <header className={cn('border-b bg-card/50 backdrop-blur-sm', className)}>
      <div className="flex h-14 items-center justify-between px-6 lg:px-8">
        {/* Breadcrumbs */}
        {breadcrumbs?.length ? (
          <nav className="flex items-center space-x-1 text-sm">
            {breadcrumbs.map((item, index) => (
              <div key={index} className="flex items-center">
                {index > 0 && (
                  <ChevronRight className="mx-1 h-4 w-4 text-muted-foreground" />
                )}
                {item.href ? (
                  <Link
                    to={item.href}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span className="text-foreground font-medium">{item.label}</span>
                )}
              </div>
            ))}
          </nav>
        ) : (
          <div />
        )}

        {/* Actions */}
        {actions && (
          <div className="flex items-center gap-2">
            {actions}
          </div>
        )}
      </div>
    </header>
  );
}
