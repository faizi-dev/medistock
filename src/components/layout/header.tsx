
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
import { useLanguage } from '@/context/language-context';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Logo } from './logo';
import { UserNav } from './user-nav';
import { LanguageSwitcher } from './language-switcher';

const navItems = [
  { href: '/dashboard', labelKey: 'nav.dashboard', icon: LayoutDashboard },
  { href: '/inventory', labelKey: 'nav.inventory', icon: Package },
  { href: '/vehicles', labelKey: 'nav.vehicles', icon: Truck },
  { href: '/smart-alerts', labelKey: 'nav.smartAlerts', icon: Lightbulb },
  { href: '/users', labelKey: 'nav.users', icon: Users, adminOnly: true },
];

export function Header() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { t } = useLanguage();
  
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
                  key={item.labelKey}
                  className={`flex items-center gap-4 px-2.5 py-2 rounded-lg ${
                    isActive
                      ? 'text-foreground bg-muted'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <item.icon className="h-5 w-5" />
                  {t(item.labelKey as any)}
                </Link>
              );
            })}
          </nav>
        </SheetContent>
      </Sheet>
      <div className="lg:hidden">
        <Logo />
      </div>
      <div className="flex items-center gap-2">
        <LanguageSwitcher />
        <UserNav />
      </div>
    </header>
  );
}
