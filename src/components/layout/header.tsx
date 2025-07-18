
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  LayoutDashboard,
  Package,
  Truck,
  Users,
  PanelLeft,
  Cog,
  Search,
} from 'lucide-react';

import { useAuth } from '@/hooks/use-auth';
import { useLanguage } from '@/context/language-context';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
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

export function Header() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b bg-background px-4 sm:px-6 lg:hidden">
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetTrigger asChild>
          <Button size="icon" variant="outline">
            <PanelLeft className="h-5 w-5" />
            <span className="sr-only">Toggle Menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="sm:max-w-xs">
          <SheetHeader>
            <Logo />
            <SheetTitle className="sr-only">Menu</SheetTitle>
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
                  onClick={() => setIsSheetOpen(false)}
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
      <div className="flex items-center gap-2">
        <LanguageSwitcher />
        <UserNav />
      </div>
    </header>
  );
}
