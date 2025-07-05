'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { collection, query, where, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { MedicalItem, Vehicle, Case, ModuleBag } from '@/types';
import { PageHeader } from '@/components/shared/page-header';
import { getColumns } from '@/components/inventory/columns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, PlusCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useLanguage } from '@/context/language-context';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ItemDialog } from '@/components/inventory/item-dialog';
import { CaseDialog } from '@/components/vehicles/case-dialog';
import { ModuleBagDialog } from '@/components/vehicles/module-bag-dialog';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

type DialogState = {
  type: 'case' | 'module' | 'item' | null;
  data: any | null;
  parentId?: string;
};

export default function VehicleInventoryPage() {
  const params = useParams();
  const router = useRouter();
  const vehicleId = params.id as string;
  const { t } = useLanguage();
  const { toast } = useToast();

  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [cases, setCases] = useState<Case[]>([]);
  const [moduleBags, setModuleBags] = useState<ModuleBag[]>([]);
  const [items, setItems] = useState<MedicalItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [isItemDialogOpen, setItemDialogOpen] = useState(false);
  const [isCaseDialogOpen, setCaseDialogOpen] = useState(false);
  const [isModuleBagDialogOpen, setModuleBagDialogOpen] = useState(false);
  
  const [dialogState, setDialogState] = useState<DialogState>({ type: null, data: null });

  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<MedicalItem | null>(null);

  useEffect(() => {
    if (!vehicleId) return;

    const vehicleDocRef = doc(db, 'vehicles', vehicleId);
    const unsubscribeVehicle = onSnapshot(vehicleDocRef, (docSnap) => {
      if (docSnap.exists()) {
        setVehicle({ id: docSnap.id, ...docSnap.data() } as Vehicle);
      } else {
        router.push('/vehicles');
      }
      setLoading(false);
    });

    const casesQuery = query(collection(db, 'cases'), where('vehicleId', '==', vehicleId));
    const unsubscribeCases = onSnapshot(casesQuery, (snapshot) => {
      const casesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Case));
      setCases(casesData);
      
      const caseIds = casesData.map(c => c.id);
      if(caseIds.length > 0) {
        const moduleBagsQuery = query(collection(db, 'moduleBags'), where('caseId', 'in', caseIds));
        onSnapshot(moduleBagsQuery, (modSnapshot) => {
          const moduleBagsData = modSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ModuleBag));
          setModuleBags(moduleBagsData);

          const moduleBagIds = moduleBagsData.map(m => m.id);
          if (moduleBagIds.length > 0) {
            const itemsQuery = query(collection(db, 'items'), where('moduleId', 'in', moduleBagIds));
            onSnapshot(itemsQuery, (itemSnapshot) => {
              setItems(itemSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MedicalItem)));
            });
          } else {
            setItems([]);
          }
        });
      } else {
        setModuleBags([]);
        setItems([]);
      }
    });

    return () => {
      unsubscribeVehicle();
      unsubscribeCases();
    };
  }, [vehicleId, router]);

  const handleEditItem = (item: MedicalItem) => {
    setDialogState({ type: 'item', data: item, parentId: item.moduleId });
    setItemDialogOpen(true);
  };
  
  const handleDeleteItem = (item: MedicalItem) => {
      setItemToDelete(item);
      setIsAlertOpen(true);
  };

  const confirmDeleteItem = async () => {
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

  const columns = useMemo(() => {
    const allColumns = getColumns(new Map(), new Map(), new Map(), handleEditItem, handleDeleteItem, t);
    return allColumns.filter(column => !['location', 'vehicleId'].includes(column.id || column.accessorKey as string));
  }, [t]);

  const ItemsTable = ({ moduleId }: { moduleId: string }) => {
    const moduleItems = useMemo(() => items.filter(item => item.moduleId === moduleId), [moduleId, items]);
    const table = useReactTable({
      data: moduleItems,
      columns,
      getCoreRowModel: getCoreRowModel(),
    });

    return (
      <div className="rounded-md border bg-card/50">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
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
    );
  };

  if (loading) {
     return (
        <div className="p-8">
            <Skeleton className="h-12 w-1/2 mb-4" />
            <Skeleton className="h-8 w-1/3 mb-8" />
            <Skeleton className="h-48 w-full" />
        </div>
     )
  }

  return (
    <>
      <PageHeader
        title={vehicle?.name || 'Loading Vehicle...'}
        description={t('vehicles.inventory.description')}
      >
        <Button onClick={() => {
          setDialogState({ type: 'case', data: null });
          setCaseDialogOpen(true);
        }}>
          <PlusCircle className="mr-2 h-4 w-4" />
          {t('vehicles.actions.addCase')}
        </Button>
        <Button asChild variant="outline">
            <Link href="/vehicles">
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t('vehicles.backToAll')}
            </Link>
        </Button>
      </PageHeader>
      
      <div className="space-y-4">
        {cases.length > 0 ? (
          <Accordion type="multiple" className="w-full space-y-4">
            {cases.map((caseItem) => (
              <AccordionItem value={caseItem.id} key={caseItem.id} className="border-none">
                <Card>
                  <CardHeader className="p-4">
                    <AccordionTrigger className="p-2 -m-2">
                        <CardTitle className="text-xl">{caseItem.name}</CardTitle>
                    </AccordionTrigger>
                  </CardHeader>
                  <AccordionContent>
                    <CardContent className="space-y-4">
                        <div className="flex justify-end gap-2">
                           <Button size="sm" onClick={() => {
                                setDialogState({ type: 'module', data: null, parentId: caseItem.id });
                                setModuleBagDialogOpen(true);
                            }}>
                                <PlusCircle className="mr-2 h-4 w-4" />
                                {t('vehicles.actions.addModule')}
                            </Button>
                        </div>
                        
                        {moduleBags.filter(m => m.caseId === caseItem.id).length > 0 ? (
                             <Accordion type="multiple" className="w-full space-y-2">
                                {moduleBags.filter(m => m.caseId === caseItem.id).map((moduleBag) => (
                                    <AccordionItem value={moduleBag.id} key={moduleBag.id} className="border rounded-md px-4">
                                        <AccordionTrigger className="py-4">
                                            <span className="font-semibold">{moduleBag.name}</span>
                                        </AccordionTrigger>
                                        <AccordionContent className="pb-4">
                                            <div className="flex justify-end mb-2">
                                                <Button variant="outline" size="sm" onClick={() => {
                                                    setDialogState({ type: 'item', data: null, parentId: moduleBag.id });
                                                    setItemDialogOpen(true);
                                                }}>
                                                    <PlusCircle className="mr-2 h-4 w-4" />
                                                    {t('vehicles.actions.addItem')}
                                                </Button>
                                            </div>
                                            <ItemsTable moduleId={moduleBag.id} />
                                        </AccordionContent>
                                    </AccordionItem>
                                ))}
                            </Accordion>
                        ) : (
                            <p className="text-muted-foreground text-center py-8">{t('vehicles.noModules')}</p>
                        )}
                    </CardContent>
                  </AccordionContent>
                </Card>
              </AccordionItem>
            ))}
          </Accordion>
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">{t('vehicles.noCases')}</p>
            </CardContent>
          </Card>
        )}
      </div>

      <ItemDialog
        isOpen={isItemDialogOpen}
        setIsOpen={setItemDialogOpen}
        item={dialogState.type === 'item' ? dialogState.data : null}
        moduleId={dialogState.parentId}
        onSuccess={() => {}}
      />
       <CaseDialog
        isOpen={isCaseDialogOpen}
        setIsOpen={setCaseDialogOpen}
        caseData={dialogState.type === 'case' ? dialogState.data : null}
        vehicleId={vehicleId}
        onSuccess={() => {}}
      />
       <ModuleBagDialog
        isOpen={isModuleBagDialogOpen}
        setIsOpen={setModuleBagDialogOpen}
        moduleData={dialogState.type === 'module' ? dialogState.data : null}
        caseId={dialogState.parentId}
        onSuccess={() => {}}
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
            <AlertDialogAction onClick={confirmDeleteItem} className="bg-destructive hover:bg-destructive/90">
              {t('inventory.deleteDialog.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
