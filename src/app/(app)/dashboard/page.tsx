
'use client';

import { useState, useEffect } from 'react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { MedicalItem, Vehicle, Case, ModuleBag } from '@/types';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Truck, AlertTriangle, Bell, Boxes } from 'lucide-react';
import { ResponsiveContainer, BarChart, XAxis, YAxis, Tooltip, Bar, CartesianGrid } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { useLanguage } from '@/context/language-context';

const processItems = (items: MedicalItem[]): MedicalItem[] => {
  return items.map(item => {
    const totalQuantity = item.batches.reduce((sum, batch) => sum + batch.quantity, 0);
    const earliestExpiration = item.batches
      .filter(b => b.expirationDate)
      .map(b => b.expirationDate!)
      .sort((a, b) => a.toMillis() - b.toMillis())[0] || null;
    return { ...item, quantity: totalQuantity, earliestExpiration };
  });
};

export default function DashboardPage() {
  const [items, setItems] = useState<MedicalItem[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [cases, setCases] = useState<Case[]>([]);
  const [moduleBags, setModuleBags] = useState<ModuleBag[]>([]);
  const [loading, setLoading] = useState(true);
  const { t } = useLanguage();

  useEffect(() => {
    const itemsQuery = query(collection(db, 'items'));
    const unsubscribeItems = onSnapshot(itemsQuery, (snapshot) => {
      const rawItems = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MedicalItem));
      setItems(processItems(rawItems));
      setLoading(false);
    });

    const vehiclesQuery = query(collection(db, 'vehicles'));
    const unsubscribeVehicles = onSnapshot(vehiclesQuery, (snapshot) => {
      setVehicles(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Vehicle)));
    });

    const casesQuery = query(collection(db, 'cases'));
    const unsubscribeCases = onSnapshot(casesQuery, (snapshot) => {
        setCases(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Case)));
    });

    const moduleBagsQuery = query(collection(db, 'moduleBags'));
    const unsubscribeModuleBags = onSnapshot(moduleBagsQuery, (snapshot) => {
        setModuleBags(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ModuleBag)));
    });

    return () => {
      unsubscribeItems();
      unsubscribeVehicles();
      unsubscribeCases();
      unsubscribeModuleBags();
    };
  }, []);

  const understockedItems = items.filter(item => (item.quantity || 0) < item.targetQuantity).length;
  
  const expiringSoonItems = items.filter(item => {
    if (!item.earliestExpiration) return false;
    const fortyTwoDaysFromNow = new Date();
    fortyTwoDaysFromNow.setDate(fortyTwoDaysFromNow.getDate() + 42);
    return item.earliestExpiration.toDate() < fortyTwoDaysFromNow;
  }).length;

  const totalItems = items.reduce((acc, item) => acc + (item.quantity || 0), 0);

  const inventoryByVehicle = vehicles.map(vehicle => {
    const casesInVehicle = cases.filter(c => c.vehicleId === vehicle.id);
    const caseIds = casesInVehicle.map(c => c.id);
    
    const modulesInVehicle = moduleBags.filter(m => caseIds.includes(m.caseId));
    const moduleIds = modulesInVehicle.map(m => m.id);

    const itemsInVehicle = items.filter(item => moduleIds.includes(item.moduleId));
    const totalQuantity = itemsInVehicle.reduce((acc, item) => acc + (item.quantity || 0), 0);

    return {
      name: vehicle.name,
      total: totalQuantity,
    };
  });

  const StatsCard = ({ title, value, icon: Icon, description, isLoading }: { title: string; value: number | string; icon: React.ElementType, description: string; isLoading: boolean }) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <>
            <Skeleton className="h-8 w-1/2" />
            <Skeleton className="mt-1 h-4 w-3/4" />
          </>
        ) : (
          <>
            <div className="text-2xl font-bold">{value}</div>
            <p className="text-xs text-muted-foreground">{description}</p>
          </>
        )}
      </CardContent>
    </Card>
  );

  return (
    <>
      <PageHeader
        title={t('dashboard.title')}
        description={t('dashboard.description')}
      />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard isLoading={loading} title={t('dashboard.totalVehicles')} value={vehicles.length} icon={Truck} description={t('dashboard.totalVehiclesDesc')} />
        <StatsCard isLoading={loading} title={t('dashboard.totalItems')} value={totalItems} icon={Boxes} description={t('dashboard.totalItemsDesc')} />
        <StatsCard isLoading={loading} title={t('dashboard.understocked')} value={understockedItems} icon={AlertTriangle} description={t('dashboard.understockedDesc')} />
        <StatsCard isLoading={loading} title={t('dashboard.expiringSoon')} value={expiringSoonItems} icon={Bell} description={t('dashboard.expiringSoonDesc')} />
      </div>
      <div className="mt-8 grid gap-4">
        <Card className="col-span-full">
          <CardHeader>
            <CardTitle>{t('dashboard.inventoryByVehicle')}</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            {loading ? <Skeleton className="h-[350px] w-full" /> : 
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={inventoryByVehicle}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`} />
                <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: 'var(--radius)',
                    }}
                 />
                <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            }
          </CardContent>
        </Card>
      </div>
    </>
  );
}
