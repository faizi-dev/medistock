
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  Truck,
  Lightbulb,
  Users,
  PanelLeft,
} from 'lucide-react';

import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Logo } from './logo';
import { UserNav } from './user-nav';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/inventory', label: 'Inventory', icon: Package },
  { href: '/vehicles', label: 'Vehicles', icon: Truck },
  { href: '/smart-alerts', label: 'Smart Alerts', icon: Lightbulb },
  { href: '/users', label: 'Users', icon: Users, adminOnly: true },
];

export function Header() {
  const pathname = usePathname();
  const { user } = useAuth();
  
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b bg-background px-4 sm:px-6 lg:hidden">
      <Sheet>
        <SheetTrigger asChild>
          <Button size="icon" variant="outline" className="sm:hidden">
            <PanelLeft className="h-5 w-5" />
            <span className="sr-only">Toggle Menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="sm:max-w-xs">
          <SheetHeader>
            <Logo />
          </SheetHeader>
          <nav className="mt-8 grid gap-2 text-lg font-medium">
            {navItems.map((item) => {
              if (item.adminOnly && user?.role !== 'Admin') {
                return null;
              }
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  href={item.href}
                  key={item.label}
                  className={`flex items-center gap-4 px-2.5 py-2 rounded-lg ${
                    isActive
                      ? 'text-foreground bg-muted'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </SheetContent>
      </Sheet>
      <div className="lg:hidden">
        <Logo />
      </div>
      <UserNav />
    </header>
  );
}
