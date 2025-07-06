
'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
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
import { Loader2, Camera } from 'lucide-react';
import { format } from 'date-fns';
import type { MedicalItem } from '@/types';
import { Timestamp } from 'firebase/firestore';
import { useLanguage } from '@/context/language-context';
import { useAuth } from '@/hooks/use-auth';
import { Html5QrcodeScanner } from 'html5-qrcode';
import type { Html5QrcodeScannerConfig, QrCodeSuccessCallback } from 'html5-qrcode';

const expirationDateSchema = z.string()
  .optional()
  .refine((val) => {
    if (!val || val === '') return true;
    return /^\d{2}\.\d{2}\.\d{2}$/.test(val);
  }, {
    message: "Date must be in DD.MM.YY format."
  })
  .transform((val, ctx) => {
    if (!val || val === '') {
      return undefined;
    }
    const [day, month, year] = val.split('.').map(num => parseInt(num, 10));
    // Assumes years 2000-2099
    const fullYear = 2000 + year;
    const date = new Date(Date.UTC(fullYear, month - 1, day));
    
    if (isNaN(date.getTime()) || date.getUTCFullYear() !== fullYear || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Invalid date. Please check day, month, and year.',
      });
      return z.NEVER;
    }

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    if (date < today) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Expiration date cannot be in the past.',
        });
        return z.NEVER;
    }

    return date;
  });

const formSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  barcode: z.string().optional(),
  quantity: z.coerce.number().int().min(0, 'Quantity must be non-negative'),
  targetQuantity: z.coerce.number().int().min(0, 'Target quantity must be non-negative'),
  expirationDate: expirationDateSchema,
  moduleId: z.string().min(1, 'Module assignment is required'),
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
  const [isScannerVisible, setIsScannerVisible] = useState(false);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

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
      quantity: 0,
      targetQuantity: 100,
      moduleId: '',
      expirationDate: '',
    },
  });

  const barcodeValue = form.watch('barcode');
  
  useEffect(() => {
    if (!isOpen) {
        setIsScannerVisible(false);
    } else {
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
        const expDate = item.expirationDate?.toDate();
        form.reset({
          ...item,
          barcode: item.barcode || '',
          expirationDate: expDate ? format(expDate, 'dd.MM.yy') : '',
        });
      } else {
        form.reset({
          name: '',
          barcode: '',
          quantity: 0,
          targetQuantity: 100,
          moduleId: moduleId || '',
          expirationDate: '',
        });
      }
    }
  }, [item, moduleId, form, isOpen]);

  useEffect(() => {
    if (!item && barcodeValue && allItems.length > 0) { // Only run for new items with a barcode
        const existingItem = allItems.find(i => i.barcode === barcodeValue);
        if (existingItem) {
            form.setValue("name", existingItem.name, { shouldValidate: true });
            form.setValue("targetQuantity", existingItem.targetQuantity, { shouldValidate: true });
            toast({
                title: 'Item Recognized',
                description: `Details for '${existingItem.name}' have been pre-filled.`
            });
        }
    }
  }, [barcodeValue, allItems, item, form, toast]);

    useEffect(() => {
    if (isScannerVisible) {
        const config: Html5QrcodeScannerConfig = {
            qrbox: { width: 250, height: 150 },
            fps: 10,
            rememberLastUsedCamera: true,
        };

        const onScanSuccess: QrCodeSuccessCallback = (decodedText, decodedResult) => {
            if (scannerRef.current) {
                scannerRef.current.clear().catch(error => {
                    console.error("Failed to clear scanner", error);
                });
            }
            setIsScannerVisible(false);
            form.setValue('barcode', decodedText, { shouldValidate: true });
            toast({ title: "Barcode Scanned", description: `Scanned: ${decodedText}` });
        };

        const onScanFailure = (error: string) => {};

        scannerRef.current = new Html5QrcodeScanner("reader", config, false);
        scannerRef.current.render(onScanSuccess, onScanFailure);
    } else {
        if (scannerRef.current) {
            scannerRef.current.clear().catch(error => {});
        }
    }

    return () => {
        if (scannerRef.current) {
            scannerRef.current.clear().catch(error => {});
        }
    };
}, [isScannerVisible, form, toast]);

  const onSubmit = async (values: ItemFormValues) => {
    setIsLoading(true);
    try {
      if (!authUser) {
        toast({ variant: 'destructive', title: 'Authentication Error', description: 'You must be logged in to perform this action.' });
        setIsLoading(false);
        return;
      }
       if (!values.moduleId) {
        toast({ variant: 'destructive', title: 'Error', description: 'Item must be associated with a module bag.' });
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
              name="expirationDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('inventory.itemDialog.expirationDateLabel')}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="DD.MM.YY"
                      {...field}
                      value={field.value || ''}
                    />
                  </FormControl>
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
                   <div className="flex items-center gap-2">
                    <FormControl>
                      <Input placeholder={t('inventory.itemDialog.barcodePlaceholder')} {...field} value={field.value ?? ''}/>
                    </FormControl>
                     <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => setIsScannerVisible(v => !v)}
                    >
                      <Camera className="h-4 w-4" />
                      <span className="sr-only">Scan Barcode</span>
                    </Button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            {isScannerVisible && (
              <div className="p-4 my-4 border rounded-md bg-card">
                <div id="reader" className="w-full"></div>
                 <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="w-full mt-2"
                    onClick={() => setIsScannerVisible(false)}
                >
                    Cancel Scan
                </Button>
              </div>
            )}
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
