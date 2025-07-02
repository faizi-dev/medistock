
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { collection, query, where, onSnapshot, getDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { MedicalItem, Vehicle } from '@/types';
import { PageHeader } from '@/components/shared/page-header';
import { getColumns } from '@/components/inventory/columns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useLanguage } from '@/context/language-context';

export default function VehicleInventoryPage() {
  const params = useParams();
  const router = useRouter();
  const vehicleId = params.id as string;
  const { t } = useLanguage();

  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [items, setItems] = useState<MedicalItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!vehicleId) return;

    const vehicleDocRef = doc(db, 'vehicles', vehicleId);
    const unsubscribeVehicle = onSnapshot(vehicleDocRef, (docSnap) => {
      if (docSnap.exists()) {
        setVehicle({ id: docSnap.id, ...docSnap.data() } as Vehicle);
      } else {
        // Handle vehicle not found
        router.push('/vehicles');
      }
    });

    const itemsQuery = query(collection(db, 'items'), where('vehicleId', '==', vehicleId));
    const unsubscribeItems = onSnapshot(itemsQuery, (snapshot) => {
      const itemsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MedicalItem));
      setItems(itemsData);
      setLoading(false);
    });

    return () => {
      unsubscribeVehicle();
      unsubscribeItems();
    };
  }, [vehicleId, router]);

  const columns = useMemo(() => {
    // We get all columns and then filter out the 'vehicle' column as it's redundant on this page.
    const allColumns = getColumns([], () => {}, () => {}, t);
    return allColumns.filter(column => column.accessorKey !== 'vehicleId');
  }, [t]);

  const table = useReactTable({
    data: items,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <>
      <PageHeader
        title={vehicle?.name || 'Loading Vehicle...'}
        description={`Inventory for vehicle ${vehicle?.name || ''}`}
      >
        <Button asChild variant="outline">
            <Link href="/vehicles">
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t('vehicles.backToAll')}
            </Link>
        </Button>
      </PageHeader>
      
      <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={columns.length}>
                      <Skeleton className="h-8 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center">
                    {t('inventory.noItems')}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </>
  );
}
