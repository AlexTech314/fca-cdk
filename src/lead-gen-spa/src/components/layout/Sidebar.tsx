import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Target,
  Building2,
  Download,
  Settings,
  Shield,
  LogOut,
  ListTodo,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { getUserInitials } from '@/lib/auth';

const SIDEBAR_COLLAPSED_KEY = 'sidebar-collapsed';

function loadCollapsed(): boolean {
  try {
    return window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true';
  } catch {
    return false;
  }
}

interface NavItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
}

function NavItem({ to, icon, label, collapsed }: NavItemProps & { collapsed: boolean }) {
  const link = (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'flex items-center rounded-lg py-2 text-sm font-medium transition-colors',
          collapsed ? 'w-10 justify-center' : 'gap-3 px-3',
          isActive
            ? 'bg-primary/10 text-primary'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        )
      }
    >
      {icon}
      {!collapsed && label}
    </NavLink>
  );

  if (collapsed) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>{link}</TooltipTrigger>
        <TooltipContent side="right">{label}</TooltipContent>
      </Tooltip>
    );
  }

  return link;
}

export function Sidebar() {
  const { user, isAdmin, signOut, organizationName } = useAuth();
  const [collapsed, setCollapsed] = useState(loadCollapsed);

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    try { window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next)); } catch {}
  };

  const mainNavItems: NavItemProps[] = [
    { to: '/', icon: <LayoutDashboard className="h-4 w-4 flex-shrink-0" />, label: 'Dashboard' },
    { to: '/leads', icon: <Users className="h-4 w-4 flex-shrink-0" />, label: 'Leads' },
    { to: '/campaigns', icon: <Target className="h-4 w-4 flex-shrink-0" />, label: 'Campaigns' },
    { to: '/franchises', icon: <Building2 className="h-4 w-4 flex-shrink-0" />, label: 'Franchises' },
    { to: '/export', icon: <Download className="h-4 w-4 flex-shrink-0" />, label: 'Export' },
    { to: '/tasks', icon: <ListTodo className="h-4 w-4 flex-shrink-0" />, label: 'Tasks' },
  ];

  const secondaryNavItems: NavItemProps[] = [
    ...(isAdmin ? [{ to: '/admin', icon: <Shield className="h-4 w-4 flex-shrink-0" />, label: 'Admin' }] : []),
    { to: '/settings', icon: <Settings className="h-4 w-4 flex-shrink-0" />, label: 'Settings' },
  ];

  return (
    <TooltipProvider>
      <aside
        className={cn(
          'flex-shrink-0 border-r bg-card sticky top-0 h-screen overflow-y-auto transition-[width] duration-200',
          collapsed ? 'w-16' : 'w-60'
        )}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className={cn('flex h-16 items-center border-b', collapsed ? 'justify-center px-2' : 'px-4')}>
            {collapsed ? (
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleCollapsed}
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
              >
                <PanelLeftOpen className="h-4 w-4" />
              </Button>
            ) : (
              <>
                <img src="/logo.png" alt={organizationName} className="h-6 w-auto brightness-0 invert flex-shrink-0" />
                <span className="ml-2 text-xs font-semibold text-foreground">
                  Flatirons Capital Advisors
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleCollapsed}
                  className="ml-auto h-8 w-8 text-muted-foreground hover:text-foreground"
                >
                  <PanelLeftClose className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>

          {/* Navigation */}
          <nav className={cn('flex-1 flex flex-col', collapsed ? 'items-center py-2' : 'p-4')}>
            {/* Main Nav */}
            <div className={cn('space-y-1', collapsed ? 'flex flex-col items-center w-full' : '')}>
              {mainNavItems.map((item) => (
                <NavItem key={item.to} {...item} collapsed={collapsed} />
              ))}
            </div>

            <Separator className={cn('my-4', collapsed && 'w-10')} />

            {/* Secondary Nav */}
            <div className={cn('space-y-1', collapsed ? 'flex flex-col items-center w-full' : '')}>
              {secondaryNavItems.map((item) => (
                <NavItem key={item.to} {...item} collapsed={collapsed} />
              ))}
            </div>
          </nav>

          {/* Sign Out */}
          <div className={cn('border-t', collapsed ? 'flex justify-center py-3' : 'p-4')}>
            {collapsed ? (
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={signOut}
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">Sign out</TooltipContent>
              </Tooltip>
            ) : user ? (
              <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9 flex-shrink-0">
                  <AvatarFallback className="bg-primary/10 text-primary text-sm">
                    {getUserInitials(user)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {user.email}
                  </p>
                  <Badge
                    variant={user.role === 'admin' ? 'default' : 'secondary'}
                    className="text-[10px] mt-0.5"
                  >
                    {user.role}
                  </Badge>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={signOut}
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      </aside>
    </TooltipProvider>
  );
}
