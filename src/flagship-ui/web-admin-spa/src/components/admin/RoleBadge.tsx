import { Badge } from '@/components/ui/badge';
import type { UserRole } from '@/types';
import { cn } from '@/lib/utils';
import { Shield, Edit, Eye } from 'lucide-react';

interface RoleBadgeProps {
  role: UserRole;
  showIcon?: boolean;
}

const roleConfig: Record<UserRole, { label: string; icon: typeof Shield; className: string }> = {
  admin: {
    label: 'Admin',
    icon: Shield,
    className: 'bg-primary/20 text-primary border-primary/30',
  },
  readwrite: {
    label: 'Read/Write',
    icon: Edit,
    className: 'bg-success/20 text-success border-success/30',
  },
  readonly: {
    label: 'Read Only',
    icon: Eye,
    className: 'bg-muted text-muted-foreground border-border',
  },
};

export function RoleBadge({ role, showIcon = false }: RoleBadgeProps) {
  const config = roleConfig[role];
  const Icon = config.icon;

  return (
    <Badge variant="outline" className={cn('gap-1', config.className)}>
      {showIcon && <Icon className="h-3 w-3" />}
      {config.label}
    </Badge>
  );
}
