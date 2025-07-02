'use client';

import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { MedicalItem, Vehicle } from '@/types';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Truck, Package, AlertTriangle, Bell, Boxes } from 'lucide-react';
import { ResponsiveContainer, BarChart, XAxis, YAxis, Tooltip, Bar, CartesianGrid } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { useLanguage } from '@/context/language-context';

export default function DashboardPage() {
  const [items, setItems] = useState<MedicalItem[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const { t } = useLanguage();

  useEffect(() => {
    const itemsQuery = query(collection(db, 'items'));
    const unsubscribeItems = onSnapshot(itemsQuery, (snapshot) => {
      const itemsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MedicalItem));
      setItems(itemsData);
      setLoading(false);
    });

    const vehiclesQuery = query(collection(db, 'vehicles'));
    const unsubscribeVehicles = onSnapshot(vehiclesQuery, (snapshot) => {
      const vehiclesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Vehicle));
      setVehicles(vehiclesData);
    });

    return () => {
      unsubscribeItems();
      unsubscribeVehicles();
    };
  }, []);

  const lowStockItems = items.filter(item => item.quantity <= item.lowStockThreshold).length;
  const expiringSoonItems = items.filter(item => {
    if (!item.expirationDate) return false;
    const sixtyDaysFromNow = new Date();
    sixtyDaysFromNow.setDate(sixtyDaysFromNow.getDate() + 60);
    return item.expirationDate.toDate() < sixtyDaysFromNow;
  }).length;

  const totalItems = items.reduce((acc, item) => acc + item.quantity, 0);

  const inventoryByVehicle = vehicles.map(vehicle => {
    const vehicleItems = items.filter(item => item.vehicleId === vehicle.id);
    const totalQuantity = vehicleItems.reduce((acc, item) => acc + item.quantity, 0);
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
        <StatsCard isLoading={loading} title={t('dashboard.lowStock')} value={lowStockItems} icon={AlertTriangle} description={t('dashboard.lowStockDesc')} />
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
