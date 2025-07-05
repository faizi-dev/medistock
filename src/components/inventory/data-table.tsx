
'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  useReactTable,
  SortingState,
  ColumnFiltersState,
} from '@tanstack/react-table';
import { collection, onSnapshot, query, doc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ItemDialog } from './item-dialog';
import { getColumns } from './columns';
import type { MedicalItem, Vehicle, Case, ModuleBag } from '@/types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '../ui/skeleton';
import { PlusCircle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useLanguage } from '@/context/language-context';

export function InventoryDataTable() {
  const [items, setItems] = useState<MedicalItem[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [cases, setCases] = useState<Case[]>([]);
  const [moduleBags, setModuleBags] = useState<ModuleBag[]>([]);

  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MedicalItem | null>(null);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<MedicalItem | null>(null);
  const { toast } = useToast();
  const { t } = useLanguage();

  useEffect(() => {
    const unsubscribes = [
      onSnapshot(query(collection(db, 'items')), snapshot => {
        setItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MedicalItem)));
        setLoading(false);
      }),
      onSnapshot(query(collection(db, 'vehicles')), snapshot => {
        setVehicles(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Vehicle)));
      }),
      onSnapshot(query(collection(db, 'cases')), snapshot => {
        setCases(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Case)));
      }),
      onSnapshot(query(collection(db, 'moduleBags')), snapshot => {
        setModuleBags(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ModuleBag)));
      }),
    ];
    return () => unsubscribes.forEach(unsub => unsub());
  }, []);

  const vehicleMap = useMemo(() => new Map(vehicles.map(v => [v.id, v])), [vehicles]);
  const caseMap = useMemo(() => new Map(cases.map(c => [c.id, c])), [cases]);
  const moduleBagMap = useMemo(() => new Map(moduleBags.map(m => [m.id, m])), [moduleBags]);

  const handleEdit = (item: MedicalItem) => {
    setSelectedItem(item);
    setIsDialogOpen(true);
  };

  const handleDelete = (item: MedicalItem) => {
    setItemToDelete(item);
    setIsAlertOpen(true);
  };

  const confirmDelete = async () => {
    if (itemToDelete) {
      try {
        await deleteDoc(doc(db, 'items', itemToDelete.id));
        toast({ title: "Item Deleted", description: `${itemToDelete.name} has been removed from inventory.` });
      } catch (error) {
        toast({ variant: 'destructive', title: "Error", description: "Could not delete item. Please try again." });
      } finally {
        setIsAlertOpen(false);
        setItemToDelete(null);
      }
    }
  };

  const columns = useMemo(() => getColumns(vehicleMap, caseMap, moduleBagMap, handleEdit, handleDelete, t), [vehicleMap, caseMap, moduleBagMap, t]);

  const table = useReactTable({
    data: items,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      sorting,
      columnFilters,
    },
  });

  return (
    <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Input
            placeholder={t('inventory.filterPlaceholder')}
            value={(table.getColumn('name')?.getFilterValue() as string) ?? ''}
            onChange={(event) =>
              table.getColumn('name')?.setFilterValue(event.target.value)
            }
            className="max-w-sm"
          />
          <Select
            value={(table.getColumn('status')?.getFilterValue() as string) ?? 'all'}
            onValueChange={(value) => table.getColumn('status')?.setFilterValue(value === 'all' ? null : value)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={t('inventory.filterByStatus')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('inventory.allStatuses')}</SelectItem>
              <SelectItem value="understocked">{t('inventory.status.understocked')}</SelectItem>
              <SelectItem value="overstocked">{t('inventory.status.overstocked')}</SelectItem>
              <SelectItem value="fullyStocked">{t('inventory.status.fullyStocked')}</SelectItem>
              <SelectItem value="expiringSoon">{t('inventory.status.expiringSoon')}</SelectItem>
              <SelectItem value="expired">{t('inventory.status.expired')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
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
              Array.from({ length: 10 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={columns.length}>
                    <Skeleton className="h-8 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'}>
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
      <div className="flex items-center justify-end space-x-2 py-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          {t('inventory.previous')}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          {t('inventory.next')}
        </Button>
      </div>
      <ItemDialog
        isOpen={isDialogOpen}
        setIsOpen={setIsDialogOpen}
        item={selectedItem}
        moduleId={selectedItem?.moduleId}
        onSuccess={() => { /* can add refresh logic here if needed */ }}
      />
      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('inventory.deleteDialog.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('inventory.deleteDialog.description').replace('{itemName}', itemToDelete?.name || '')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('inventory.deleteDialog.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">
              {t('inventory.deleteDialog.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
