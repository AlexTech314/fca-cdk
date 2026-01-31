import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Trophy,
  FileText,
  FileEdit,
  BarChart3,
  Users,
  Inbox,
  Settings,
  LogOut,
  Shield,
} from 'lucide-react';

import { useAuth } from '@/hooks/useAuth';
import { getUserInitials } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import logo from '@/assets/logo.png';

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
}

const contentNavItems: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: <LayoutDashboard className="h-4 w-4" /> },
  { to: '/tombstones', label: 'Tombstones', icon: <Trophy className="h-4 w-4" /> },
  { to: '/blog-posts', label: 'Blog Posts', icon: <FileText className="h-4 w-4" /> },
  { to: '/pages', label: 'Pages', icon: <FileEdit className="h-4 w-4" /> },
];

const dataNavItems: NavItem[] = [
  { to: '/analytics', label: 'Analytics', icon: <BarChart3 className="h-4 w-4" /> },
  { to: '/subscribers', label: 'Subscribers', icon: <Users className="h-4 w-4" /> },
  { to: '/intakes', label: 'Intakes', icon: <Inbox className="h-4 w-4" /> },
];

const settingsNavItems: NavItem[] = [
  { to: '/settings', label: 'Settings', icon: <Settings className="h-4 w-4" /> },
];

function NavLinkItem({ to, label, icon }: NavItem) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
          isActive
            ? 'bg-primary/10 text-primary'
            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
        )
      }
    >
      {icon}
      {label}
    </NavLink>
  );
}

export function Sidebar() {
  const { user, signOut, isAdmin } = useAuth();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <aside className="w-60 flex-shrink-0 border-r bg-card">
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center gap-2 border-b px-6">
          <img
            src={logo}
            alt="Flatirons Capital"
            className="h-6 w-auto brightness-0 invert"
          />
          <span className="text-sm font-semibold">Flatirons Capital</span>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 px-3 py-4">
          <nav className="space-y-1">
            {contentNavItems.map((item) => (
              <NavLinkItem key={item.to} {...item} />
            ))}
          </nav>

          <Separator className="my-4" />

          <nav className="space-y-1">
            {dataNavItems.map((item) => (
              <NavLinkItem key={item.to} {...item} />
            ))}
          </nav>

          <Separator className="my-4" />

          <nav className="space-y-1">
            {settingsNavItems.map((item) => (
              <NavLinkItem key={item.to} {...item} />
            ))}
            {isAdmin && (
              <NavLinkItem
                to="/admin"
                label="Team"
                icon={<Shield className="h-4 w-4" />}
              />
            )}
          </nav>
        </ScrollArea>

        {/* User section */}
        <div className="border-t p-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9">
              <AvatarFallback className="bg-primary/10 text-primary text-sm">
                {getUserInitials(user)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {user?.name || 'User'}
              </p>
              <Badge variant="secondary" className="text-xs">
                {user?.role || 'user'}
              </Badge>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full mt-3 justify-start text-muted-foreground"
            onClick={handleSignOut}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign out
          </Button>
        </div>
      </div>
    </aside>
  );
}
