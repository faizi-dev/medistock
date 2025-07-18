
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { collection, onSnapshot, query, writeBatch, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { PageHeader } from '@/components/shared/page-header';
import { useLanguage } from '@/context/language-context';
import type { MedicalItem, InventoryCheck, InventoryCheckItem } from '@/types';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

type FormValues = {
  items: {
    id: string;
    name: string;
    reviewed: boolean;
    batches: {
      originalQty: number;
      actualQty: number | string;
      expirationDate: Date | null;
      isExpired: boolean;
    }[];
  }[];
};

const processItemsForChecklist = (items: MedicalItem[]) => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  return items.map(item => ({
    id: item.id,
    name: item.name,
    reviewed: false,
    batches: (item.batches || []).map(batch => {
      const expDate = batch.expirationDate?.toDate() || null;
      return {
        originalQty: batch.quantity,
        actualQty: batch.quantity, // Pre-fill with original quantity
        expirationDate: expDate,
        isExpired: expDate ? expDate < now : false,
      };
    }),
  }));
};

export default function InventoryCheckPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { control, handleSubmit, formState: { errors } } = useForm<FormValues>({
    defaultValues: { items: [] },
  });

  const { fields, replace } = useFieldArray({
    control,
    name: 'items',
  });

  useEffect(() => {
    const itemsQuery = query(collection(db, 'items'));
    const unsubscribe = onSnapshot(itemsQuery, (snapshot) => {
      const rawItems = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MedicalItem));
      const processed = processItemsForChecklist(rawItems);
      replace(processed);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching items:", error);
      setLoading(false);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch inventory items.' });
    });

    return () => unsubscribe();
  }, [replace, toast]);

  const onSubmit = async (data: FormValues) => {
    if (!user) {
      toast({ variant: 'destructive', title: 'Authentication Error', description: 'You must be logged in.' });
      return;
    }
    setIsSubmitting(true);

    try {
      const batch = writeBatch(db);
      const checkItems: InventoryCheckItem[] = [];

      for (const item of data.items) {
        if (!item.reviewed) continue;

        const updatedBatches: any[] = [];
        let hasChanges = false;

        for (const batchData of item.batches) {
          const actualQty = Number(batchData.actualQty);
          if (isNaN(actualQty) || actualQty < 0) {
            toast({ variant: 'destructive', title: 'Invalid Input', description: `Invalid quantity for ${item.name}.` });
            setIsSubmitting(false);
            return;
          }

          if (actualQty !== batchData.originalQty) {
            hasChanges = true;
            checkItems.push({
              itemName: item.name,
              batchExpiration: batchData.expirationDate ? format(batchData.expirationDate, 'yyyy-MM-dd') : 'N/A',
              quantityBefore: batchData.originalQty,
              quantityAfter: actualQty,
              isExpired: batchData.isExpired,
            });
          }
          
          if(actualQty > 0) { // Only keep batches with quantity > 0
            updatedBatches.push({
                quantity: actualQty,
                expirationDate: batchData.expirationDate ? batchData.expirationDate : null,
            });
          }
        }
        
        if (hasChanges) {
            const itemRef = doc(db, 'items', item.id);
            batch.update(itemRef, { batches: updatedBatches, updatedAt: serverTimestamp(), updatedBy: { uid: user.uid, name: user.fullName || user.email } });
        }
      }

      if (checkItems.length === 0 && data.items.some(i => i.reviewed)) {
          toast({ title: 'No Changes', description: 'Inventory check complete, no changes were recorded.'});
      }

      const checkLog: Omit<InventoryCheck, 'id'> = {
        checkedAt: serverTimestamp(),
        checkedBy: { uid: user.uid, name: user.fullName || user.email },
        items: checkItems
      };
      
      const checkDocRef = await addDoc(collection(db, 'inventoryChecks'), checkLog);
      
      await batch.commit();

      toast({ title: 'Inventory Check Complete', description: 'Your inventory has been updated.' });
      router.push(`/inventory/check/report/${checkDocRef.id}`);

    } catch (error) {
      console.error("Error completing inventory check:", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not complete the inventory check. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <PageHeader title={t('inventoryCheck.pageTitle')} description={t('inventoryCheck.pageDescription')} />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  return (
    <>
      <PageHeader title={t('inventoryCheck.pageTitle')} description={t('inventoryCheck.pageDescription')} />
      
      <Alert className="mb-6">
        <Info className="h-4 w-4" />
        <AlertTitle>{t('inventoryCheck.instructionsTitle')}</AlertTitle>
        <AlertDescription>{t('inventoryCheck.instructions')}</AlertDescription>
      </Alert>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">{t('inventoryCheck.table.reviewed')}</TableHead>
                <TableHead>{t('inventoryCheck.table.item')}</TableHead>
                <TableHead>{t('inventoryCheck.table.batchDetails')}</TableHead>
                <TableHead className="w-[150px]">{t('inventoryCheck.table.expectedQty')}</TableHead>
                <TableHead className="w-[150px]">{t('inventoryCheck.table.actualQty')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fields.map((field, index) => (
                <TableRow key={field.id} className={field.batches.some(b => b.isExpired) ? 'bg-destructive/10' : ''}>
                  <TableCell className="align-top pt-4">
                    <Controller
                      name={`items.${index}.reviewed`}
                      control={control}
                      render={({ field }) => (
                          <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                          />
                      )}
                    />
                  </TableCell>
                  <TableCell className="font-medium align-top pt-4">{field.name}</TableCell>
                  <TableCell>
                    {field.batches.map((batch, batchIndex) => (
                      <div key={batchIndex} className={`flex items-center h-12 ${batch.isExpired ? 'text-destructive font-semibold' : ''}`}>
                          {batch.expirationDate ? format(batch.expirationDate, 'dd.MM.yyyy') : t('inventoryCheck.noExpiration')}
                          {batch.isExpired && ` (${t('inventory.status.expired')})`}
                      </div>
                    ))}
                  </TableCell>
                  <TableCell>
                    {field.batches.map((batch, batchIndex) => (
                      <div key={batchIndex} className="flex items-center h-12">
                        {batch.originalQty}
                      </div>
                    ))}
                  </TableCell>
                  <TableCell>
                    {field.batches.map((batch, batchIndex) => (
                      <div key={batchIndex} className="flex items-center h-12">
                        <Controller
                          name={`items.${index}.batches.${batchIndex}.actualQty`}
                          control={control}
                           rules={{ required: 'Required', min: { value: 0, message: '>= 0' } }}
                          render={({ field: controllerField, fieldState }) => (
                            <div>
                                <Input
                                    type="number"
                                    className={`w-24 ${fieldState.error ? 'border-destructive' : ''}`}
                                    {...controllerField}
                                />
                                {fieldState.error && <p className="text-xs text-destructive mt-1">{fieldState.error.message}</p>}
                            </div>
                          )}
                        />
                      </div>
                    ))}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="flex justify-end mt-6">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('inventoryCheck.completeButton')}
          </Button>
        </div>
      </form>
    </>
  );
}

