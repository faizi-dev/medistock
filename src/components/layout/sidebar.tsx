
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  Truck,
  Users,
  Cog,
  Search,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import { useLanguage } from '@/context/language-context';
import { Button } from '@/components/ui/button';
import { Logo } from './logo';
import { UserNav } from './user-nav';
import { LanguageSwitcher } from './language-switcher';

const navItems = [
  { href: '/dashboard', labelKey: 'nav.dashboard', icon: LayoutDashboard },
  { href: '/inventory', labelKey: 'nav.inventory', icon: Package },
  { href: '/item-lookup', labelKey: 'nav.itemLookup', icon: Search },
  { href: '/vehicles', labelKey: 'nav.vehicles', icon: Truck },
  { href: '/users', labelKey: 'nav.users', icon: Users, adminOnly: true },
  { href: '/settings', labelKey: 'nav.settings', icon: Cog, adminOnly: true },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { t } = useLanguage();

  return (
    <aside className="hidden h-screen w-64 flex-col border-r bg-sidebar text-sidebar-foreground shadow-lg lg:flex">
      <div className="flex h-16 items-center border-b px-6">
        <Logo />
      </div>
      <div className="flex flex-1 flex-col overflow-y-auto">
        <nav className="flex-1 space-y-2 p-4">
          {navItems.map((item) => {
            if (item.adminOnly && user?.role !== 'Admin') {
              return null;
            }
            const isActive = pathname.startsWith(item.href);
            return (
              <Link href={item.href} key={item.labelKey}>
                <Button
                  variant={isActive ? 'secondary' : 'ghost'}
                  className={cn(
                    'w-full justify-start',
                    isActive &&
                      'bg-sidebar-accent text-sidebar-accent-foreground'
                  )}
                >
                  <item.icon className="mr-3 h-5 w-5" />
                  {t(item.labelKey as any)}
                </Button>
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="border-t p-4 flex items-center justify-between">
        <UserNav />
        <LanguageSwitcher />
      </div>
    </aside>
  );
}
