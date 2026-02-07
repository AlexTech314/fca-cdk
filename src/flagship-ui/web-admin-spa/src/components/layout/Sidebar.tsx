import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Trophy,
  Newspaper,
  BookOpen,
  BarChart3,
  Users,
  Inbox,
  Settings,
  LogOut,
  Shield,
  Home,
  Info,
  HelpCircle,
  Heart,
  Briefcase,
  Building2,
  UserCircle,
  HeartHandshake,
} from 'lucide-react';

import { useAuth } from '@/hooks/useAuth';
import { getUserInitials } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import logo from '@/assets/logo.png';

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
}

// Main content sections
const mainNavItems: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: <LayoutDashboard className="h-4 w-4" /> },
];

// Transaction & News content
const contentNavItems: NavItem[] = [
  { to: '/transactions', label: 'Transactions', icon: <Trophy className="h-4 w-4" /> },
  { to: '/news', label: 'News', icon: <Newspaper className="h-4 w-4" /> },
  { to: '/resources', label: 'Resources', icon: <BookOpen className="h-4 w-4" /> },
];

// Static page content management
const pagesNavItems: NavItem[] = [
  { to: '/pages/home', label: 'Homepage', icon: <Home className="h-4 w-4" /> },
  { to: '/pages/about', label: 'About', icon: <Info className="h-4 w-4" /> },
  { to: '/pages/team', label: 'Team', icon: <UserCircle className="h-4 w-4" /> },
  { to: '/pages/faq', label: 'FAQ', icon: <HelpCircle className="h-4 w-4" /> },
  { to: '/pages/services', label: 'Services', icon: <Briefcase className="h-4 w-4" /> },
  { to: '/pages/industries', label: 'Industries', icon: <Building2 className="h-4 w-4" /> },
  { to: '/pages/community', label: 'Community', icon: <HeartHandshake className="h-4 w-4" /> },
  { to: '/pages/core-values', label: 'Core Values', icon: <Heart className="h-4 w-4" /> },
];

const dataNavItems: NavItem[] = [
  { to: '/analytics', label: 'Analytics', icon: <BarChart3 className="h-4 w-4" /> },
  { to: '/subscribers', label: 'Subscribers', icon: <Users className="h-4 w-4" /> },
  { to: '/intakes', label: 'Seller Intakes', icon: <Inbox className="h-4 w-4" /> },
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
          {/* Main */}
          <nav className="space-y-1">
            {mainNavItems.map((item) => (
              <NavLinkItem key={item.to} {...item} />
            ))}
          </nav>

          {/* Content */}
          <div className="mt-6">
            <p className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Content
            </p>
            <nav className="space-y-1">
              {contentNavItems.map((item) => (
                <NavLinkItem key={item.to} {...item} />
              ))}
            </nav>
          </div>

          {/* Pages */}
          <div className="mt-6">
            <p className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Pages
            </p>
            <nav className="space-y-1">
              {pagesNavItems.map((item) => (
                <NavLinkItem key={item.to} {...item} />
              ))}
            </nav>
          </div>

          {/* Data */}
          <div className="mt-6">
            <p className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Data
            </p>
            <nav className="space-y-1">
              {dataNavItems.map((item) => (
                <NavLinkItem key={item.to} {...item} />
              ))}
            </nav>
          </div>

          {/* Settings */}
          <div className="mt-6">
            <p className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              System
            </p>
            <nav className="space-y-1">
              {settingsNavItems.map((item) => (
                <NavLinkItem key={item.to} {...item} />
              ))}
              {isAdmin && (
                <NavLinkItem
                  to="/admin"
                  label="User Management"
                  icon={<Shield className="h-4 w-4" />}
                />
              )}
            </nav>
          </div>
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
