
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { addDoc, collection, doc, serverTimestamp, setDoc, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Loader2, Camera, PlusCircle, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import type { MedicalItem, MedicalItemBatch } from '@/types';
import { Timestamp } from 'firebase/firestore';
import { useLanguage } from '@/context/language-context';
import { useAuth } from '@/hooks/use-auth';
import { Separator } from '../ui/separator';
import { Textarea } from '../ui/textarea';

const batchSchema = z.object({
  quantity: z.coerce.number().int().min(1, 'Quantity must be at least 1'),
  expirationDate: z.string().optional()
    .refine((val) => {
      if (!val || val === '') return true;
      return /^\d{2}\.\d{2}\.\d{2}$/.test(val);
    }, { message: "Date must be DD.MM.YY" })
    .transform((val, ctx) => {
      if (!val || val === '') return null;
      const [day, month, year] = val.split('.').map(num => parseInt(num, 10));
      const fullYear = 2000 + year;
      const date = new Date(Date.UTC(fullYear, month - 1, day));

      if (isNaN(date.getTime()) || date.getUTCFullYear() !== fullYear || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Invalid date.' });
        return z.NEVER;
      }
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);
      if (date < today) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Date cannot be in the past.' });
        return z.NEVER;
      }
      return date;
    }),
});

const formSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  barcode: z.string().optional(),
  targetQuantity: z.coerce.number().int().min(0, 'Target must be non-negative'),
  moduleId: z.string().min(1, 'Module assignment is required'),
  notes: z.string().optional(),
  batches: z.array(batchSchema).min(1, 'At least one batch is required.'),
});

type ItemFormValues = z.infer<typeof formSchema>;

interface ItemDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  item?: MedicalItem | null;
  moduleId?: string | null;
  onSuccess: () => void;
}

export function ItemDialog({ isOpen, setIsOpen, item, moduleId, onSuccess }: ItemDialogProps) {
  const { toast } = useToast();
  const { t } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const [allItems, setAllItems] = useState<MedicalItem[]>([]);
  const { user: authUser } = useAuth();

  const uniqueItemsByName = useMemo(() => {
    const seen = new Set<string>();
    return allItems.filter(item => {
        const lowerCaseName = item.name.toLowerCase();
        if (seen.has(lowerCaseName)) {
            return false;
        } else {
            seen.add(lowerCaseName);
            return true;
        }
    });
  }, [allItems]);

  const form = useForm<ItemFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      barcode: '',
      targetQuantity: 100,
      moduleId: '',
      notes: '',
      batches: [{ quantity: 0, expirationDate: '' }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "batches"
  });

  const barcodeValue = form.watch('barcode');
  const batches = form.watch('batches');
  const totalQuantity = useMemo(() => {
    return batches.reduce((sum, batch) => sum + (Number(batch.quantity) || 0), 0);
  }, [batches]);
  
  useEffect(() => {
    if (isOpen) {
        const fetchItems = async () => {
            const itemsSnapshot = await getDocs(collection(db, 'items'));
            const itemsList = itemsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as MedicalItem);
            setAllItems(itemsList);
        }
        fetchItems();
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      if (item) {
        form.reset({
          name: item.name,
          barcode: item.barcode || '',
          targetQuantity: item.targetQuantity,
          moduleId: item.moduleId,
          notes: item.notes || '',
          batches: (item.batches || []).map(b => ({
            quantity: b.quantity,
            expirationDate: b.expirationDate ? format(b.expirationDate.toDate(), 'dd.MM.yy') : ''
          }))
        });
      } else {
        form.reset({
          name: '',
          barcode: '',
          targetQuantity: 100,
          moduleId: moduleId || '',
          notes: '',
          batches: [{ quantity: 1, expirationDate: '' }],
        });
      }
    }
  }, [item, moduleId, form, isOpen]);

  useEffect(() => {
    if (!item && barcodeValue && allItems.length > 0) {
        const existingItem = allItems.find(i => i.barcode === barcodeValue);
        if (existingItem) {
            form.setValue("name", existingItem.name, { shouldValidate: true });
            form.setValue("targetQuantity", existingItem.targetQuantity, { shouldValidate: true });
            form.setValue("notes", existingItem.notes || '', { shouldValidate: true });
            toast({
                title: 'Item Recognized',
                description: `Details for '${existingItem.name}' have been pre-filled.`
            });
        }
    }
  }, [barcodeValue, allItems, item, form, toast]);

  const onSubmit = async (values: ItemFormValues) => {
    setIsLoading(true);
    try {
      if (!authUser) throw new Error('Authentication Error');
      if (!values.moduleId) throw new Error('Item must be associated with a module bag.');

      const itemData: Omit<MedicalItem, 'id' | 'createdAt' | 'createdBy' > = {
        name: values.name,
        barcode: values.barcode,
        targetQuantity: values.targetQuantity,
        notes: values.notes,
        moduleId: values.moduleId,
        batches: values.batches.map(b => ({
          quantity: b.quantity,
          expirationDate: b.expirationDate ? Timestamp.fromDate(b.expirationDate as Date) : null,
        })),
        updatedAt: serverTimestamp() as Timestamp,
        updatedBy: { uid: authUser.uid, name: authUser.fullName || authUser.email },
      };
      
      if (item) {
        await setDoc(doc(db, 'items', item.id), itemData, { merge: true });
        toast({ title: 'Item Updated', description: `${values.name} has been updated.` });
      } else {
        const fullItemData = {
            ...itemData,
            createdAt: serverTimestamp() as Timestamp,
            createdBy: { uid: authUser.uid, name: authUser.fullName || authUser.email },
        }
        await addDoc(collection(db, 'items'), fullItemData);
        toast({ title: 'Item Added', description: `${values.name} has been added to inventory.` });
      }
      onSuccess();
      setIsOpen(false);
    } catch (error: any) {
      console.error("Error saving item: ", error);
      toast({ variant: 'destructive', title: 'Error', description: error.message || 'Could not save the item. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{item ? t('inventory.itemDialog.editTitle') : t('inventory.itemDialog.addTitle')}</DialogTitle>
          <DialogDescription>
            {item ? t('inventory.itemDialog.editDescription') : t('inventory.itemDialog.addDescription')}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('inventory.itemDialog.nameLabel')}</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder={t('inventory.itemDialog.namePlaceholder')} 
                        {...field}
                        list="item-names"
                        autoComplete="off"
                      />
                    </FormControl>
                    <datalist id="item-names">
                      {uniqueItemsByName.map((i) => (
                          <option key={i.id} value={i.name} />
                      ))}
                    </datalist>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="targetQuantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('inventory.itemDialog.targetQuantityLabel')}</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="barcode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('inventory.itemDialog.barcodeLabel')}</FormLabel>
                   <div className="flex items-center gap-2">
                    <FormControl>
                      <Input placeholder={t('inventory.itemDialog.barcodePlaceholder')} {...field} value={field.value ?? ''}/>
                    </FormControl>
                     <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => {}}
                    >
                      <Camera className="h-4 w-4" />
                      <span className="sr-only">Scan Barcode</span>
                    </Button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('inventory.itemDialog.notesLabel')}</FormLabel>
                  <FormControl>
                    <Textarea placeholder={t('inventory.itemDialog.notesPlaceholder')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Separator />

            <div className="space-y-4 max-h-60 overflow-y-auto pr-2">
                <h3 className="text-lg font-medium">{t('inventory.itemDialog.batchesHeader')}</h3>
                {fields.map((field, index) => (
                    <div key={field.id} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-start p-3 border rounded-lg">
                        <FormField
                            control={form.control}
                            name={`batches.${index}.quantity`}
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>{t('inventory.itemDialog.quantityLabel')}</FormLabel>
                                <FormControl>
                                    <Input type="number" {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name={`batches.${index}.expirationDate`}
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>{t('inventory.itemDialog.expirationDateLabel')}</FormLabel>
                                <FormControl>
                                    <Input placeholder="DD.MM.YY" {...field} value={field.value || ''} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                         <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="mt-8"
                            onClick={() => remove(index)}
                            disabled={fields.length <= 1}
                            >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Remove batch</span>
                        </Button>
                    </div>
                ))}
            </div>

            <div className="flex justify-between items-center">
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => append({ quantity: 1, expirationDate: '' })}
                >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    {t('inventory.itemDialog.addBatch')}
                </Button>
                <div className="text-right">
                    <span className="text-sm font-medium text-muted-foreground">{t('inventory.itemDialog.totalQuantity')}: </span>
                    <span className="text-lg font-bold">{totalQuantity}</span>
                </div>
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>{t('inventory.itemDialog.cancel')}</Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('inventory.itemDialog.save')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
