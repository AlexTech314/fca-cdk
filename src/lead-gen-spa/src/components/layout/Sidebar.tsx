import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Target, 
  Download, 
  Settings, 
  Shield,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getUserInitials } from '@/lib/auth';
import logo from '@/assets/logo.png';

interface NavItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
}

function NavItem({ to, icon, label }: NavItemProps) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
          isActive
            ? 'bg-primary/10 text-primary'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        )
      }
    >
      {icon}
      {label}
    </NavLink>
  );
}

export function Sidebar() {
  const { user, isAdmin, signOut, organizationName } = useAuth();

  const mainNavItems: NavItemProps[] = [
    { to: '/', icon: <LayoutDashboard className="h-4 w-4" />, label: 'Dashboard' },
    { to: '/leads', icon: <Users className="h-4 w-4" />, label: 'Leads' },
    { to: '/campaigns', icon: <Target className="h-4 w-4" />, label: 'Campaigns' },
    { to: '/export', icon: <Download className="h-4 w-4" />, label: 'Export' },
  ];

  const secondaryNavItems: NavItemProps[] = [
    ...(isAdmin ? [{ to: '/admin', icon: <Shield className="h-4 w-4" />, label: 'Admin' }] : []),
    { to: '/settings', icon: <Settings className="h-4 w-4" />, label: 'Settings' },
  ];

  return (
    <aside className="w-60 flex-shrink-0 border-r bg-card sticky top-0 h-screen overflow-y-auto">
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center gap-2 border-b px-4">
          <img src={logo} alt={organizationName} className="h-6 w-auto brightness-0 invert" />
          <span className="text-sm font-semibold text-foreground">
            Flatirons Capital
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-4">
          {/* Main Nav */}
          <div className="space-y-1">
            {mainNavItems.map((item) => (
              <NavItem key={item.to} {...item} />
            ))}
          </div>

          <Separator className="my-4" />

          {/* Secondary Nav */}
          <div className="space-y-1">
            {secondaryNavItems.map((item) => (
              <NavItem key={item.to} {...item} />
            ))}
          </div>
        </nav>

        {/* User Profile */}
        {user && (
          <div className="border-t p-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-primary/10 text-primary text-sm">
                  {getUserInitials(user)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {user.name || user.email}
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
          </div>
        )}
      </div>
    </aside>
  );
}
