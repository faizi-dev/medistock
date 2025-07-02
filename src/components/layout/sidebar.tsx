
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  Truck,
  Lightbulb,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Logo } from './logo';
import { UserNav } from './user-nav';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/inventory', label: 'Inventory', icon: Package },
  { href: '/vehicles', label: 'Vehicles', icon: Truck },
  { href: '/smart-alerts', label: 'Smart Alerts', icon: Lightbulb },
  { href: '/users', label: 'Users', icon: Users, adminOnly: true },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();

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
              <Link href={item.href} key={item.label}>
                <Button
                  variant={isActive ? 'secondary' : 'ghost'}
                  className={cn(
                    'w-full justify-start',
                    isActive &&
                      'bg-sidebar-accent text-sidebar-accent-foreground'
                  )}
                >
                  <item.icon className="mr-3 h-5 w-5" />
                  {item.label}
                </Button>
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="border-t p-4">
        <UserNav />
      </div>
    </aside>
  );
}
