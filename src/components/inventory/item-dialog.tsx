'use client';

import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import type { MedicalItem, Vehicle } from '@/types';
import { Timestamp } from 'firebase/firestore';
import { useLanguage } from '@/context/language-context';
import { useAuth } from '@/hooks/use-auth';

const formSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  barcode: z.string().optional(),
  quantity: z.coerce.number().int().min(0, 'Quantity must be non-negative'),
  lowStockThreshold: z.coerce.number().int().min(0, 'Threshold must be non-negative'),
  expirationDate: z.date().optional(),
  vehicleId: z.string().min(1, 'Vehicle assignment is required'),
});

type ItemFormValues = z.infer<typeof formSchema>;

interface ItemDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  item?: MedicalItem | null;
  onSuccess: () => void;
}

export function ItemDialog({ isOpen, setIsOpen, item, onSuccess }: ItemDialogProps) {
  const { toast } = useToast();
  const { t } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
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

  useEffect(() => {
    async function fetchData() {
      const vehiclesSnapshot = await getDocs(collection(db, 'vehicles'));
      const vehiclesList = vehiclesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Vehicle);
      setVehicles(vehiclesList);

      const itemsSnapshot = await getDocs(collection(db, 'items'));
      const itemsList = itemsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as MedicalItem);
      setAllItems(itemsList);
    }
    
    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

  const form = useForm<ItemFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: item
      ? {
          ...item,
          expirationDate: item.expirationDate?.toDate(),
        }
      : {
          name: '',
          barcode: '',
          quantity: 0,
          lowStockThreshold: 10,
          vehicleId: '',
        },
  });

  useEffect(() => {
    if (isOpen) {
      if (item) {
        form.reset({
          ...item,
          expirationDate: item.expirationDate?.toDate(),
        });
      } else {
        form.reset({
          name: '',
          barcode: '',
          quantity: 0,
          lowStockThreshold: 10,
          vehicleId: '',
          expirationDate: undefined,
        });
      }
    }
  }, [item, form, isOpen]);

  const onSubmit = async (values: ItemFormValues) => {
    setIsLoading(true);
    try {
      if (!authUser) {
        toast({ variant: 'destructive', title: 'Authentication Error', description: 'You must be logged in to perform this action.' });
        setIsLoading(false);
        return;
      }

      const itemData: any = {
        ...values,
        expirationDate: values.expirationDate ? Timestamp.fromDate(values.expirationDate) : null,
      };
      
      if (item) {
        itemData.updatedAt = serverTimestamp();
        itemData.updatedBy = { uid: authUser.uid, name: authUser.fullName || authUser.email };
        await setDoc(doc(db, 'items', item.id), itemData, { merge: true });
        toast({ title: 'Item Updated', description: `${values.name} has been updated.` });
      } else {
        itemData.createdAt = serverTimestamp();
        itemData.createdBy = { uid: authUser.uid, name: authUser.fullName || authUser.email };
        await addDoc(collection(db, 'items'), itemData);
        toast({ title: 'Item Added', description: `${values.name} has been added to inventory.` });
      }
      onSuccess();
      setIsOpen(false);
    } catch (error) {
      console.error("Error saving item: ", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not save the item. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{item ? t('inventory.itemDialog.editTitle') : t('inventory.itemDialog.addTitle')}</DialogTitle>
          <DialogDescription>
            {item ? t('inventory.itemDialog.editDescription') : t('inventory.itemDialog.addDescription')}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
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
                      onChange={(e) => {
                        field.onChange(e);
                        if (!item) { // Only pre-fill when creating a new item
                            const selectedItem = uniqueItemsByName.find(
                                (i) => i.name.toLowerCase() === e.target.value.toLowerCase()
                            );
                            if (selectedItem) {
                                form.setValue("barcode", selectedItem.barcode || '', { shouldValidate: true });
                                form.setValue("lowStockThreshold", selectedItem.lowStockThreshold, { shouldValidate: true });
                            }
                        }
                      }}
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
              name="vehicleId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('inventory.itemDialog.vehicleLabel')}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('inventory.itemDialog.vehiclePlaceholder')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {vehicles.map((v) => (
                        <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="quantity"
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
                name="lowStockThreshold"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('inventory.itemDialog.lowStockLabel')}</FormLabel>
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
              name="expirationDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>{t('inventory.itemDialog.expirationDateLabel')}</FormLabel>
                   <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>{t('inventory.itemDialog.pickDate')}</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) =>
                          date < new Date()
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="barcode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('inventory.itemDialog.barcodeLabel')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('inventory.itemDialog.barcodePlaceholder')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
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
