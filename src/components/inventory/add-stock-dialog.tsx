
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { doc, updateDoc, arrayUnion, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/context/language-context';
import { useAuth } from '@/hooks/use-auth';
import type { MedicalItem, MedicalItemBatch } from '@/types';
import { Timestamp } from 'firebase/firestore';

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
import { Loader2 } from 'lucide-react';

const addStockSchema = z.object({
  quantity: z.coerce.number().int().min(1, 'Quantity must be at least 1'),
  expirationDate: z.string().optional()
    .refine((val) => !val || /^\d{2}\.\d{2}\.\d{2}$/.test(val), { message: "Date must be DD.MM.YY or empty" })
    .transform((val, ctx) => {
        if (!val) return null;
        const [day, month, year] = val.split('.').map(num => parseInt(num, 10));
        const fullYear = 2000 + year;
        const date = new Date(Date.UTC(fullYear, month - 1, day));
        if (isNaN(date.getTime())) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Invalid date.' });
            return z.NEVER;
        }
        return date;
    }),
  deliveryDate: z.string().optional()
    .refine((val) => !val || /^\d{2}\.\d{2}\.\d{2}$/.test(val), { message: "Date must be DD.MM.YY or empty" })
    .transform((val, ctx) => {
        if (!val) return null;
        const [day, month, year] = val.split('.').map(num => parseInt(num, 10));
        const fullYear = 2000 + year;
        const date = new Date(Date.UTC(fullYear, month - 1, day));
        if (isNaN(date.getTime())) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Invalid date.' });
            return z.NEVER;
        }
        return date;
    }),
});

type AddStockFormValues = z.infer<typeof addStockSchema>;

interface AddStockDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  item: MedicalItem | null;
  onSuccess: () => void;
}

export function AddStockDialog({ isOpen, setIsOpen, item, onSuccess }: AddStockDialogProps) {
  const { toast } = useToast();
  const { t } = useLanguage();
  const { user: authUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<AddStockFormValues>({
    resolver: zodResolver(addStockSchema),
    defaultValues: {
      quantity: 1,
      expirationDate: '',
      deliveryDate: '',
    },
  });

  useEffect(() => {
    if (!isOpen) {
      form.reset({
        quantity: 1,
        expirationDate: '',
        deliveryDate: '',
      });
    }
  }, [isOpen, form]);

  const onSubmit = async (values: AddStockFormValues) => {
    if (!item || !authUser) return;
    setIsLoading(true);

    try {
      const itemRef = doc(db, 'items', item.id);
      
      const newBatch: MedicalItemBatch = {
        quantity: values.quantity,
        expirationDate: values.expirationDate ? Timestamp.fromDate(values.expirationDate) : null,
        deliveryDate: values.deliveryDate ? Timestamp.fromDate(values.deliveryDate) : null,
      };

      await updateDoc(itemRef, {
        batches: arrayUnion(newBatch),
        updatedAt: serverTimestamp(),
        updatedBy: { uid: authUser.uid, name: authUser.fullName || authUser.email },
      });

      toast({
        title: t('addStockDialog.toast.success.title'),
        description: t('addStockDialog.toast.success.description').replace('{quantity}', values.quantity.toString()).replace('{itemName}', item.name),
      });
      onSuccess();
      setIsOpen(false);
    } catch (error: any) {
      console.error("Error adding stock:", error);
      toast({
        variant: 'destructive',
        title: t('addStockDialog.toast.error.title'),
        description: t('addStockDialog.toast.error.description'),
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('addStockDialog.title')} - {item?.name}</DialogTitle>
          <DialogDescription>{t('addStockDialog.description')}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('addStockDialog.quantityLabel')}</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="expirationDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('addStockDialog.expirationDateLabel')}</FormLabel>
                  <FormControl>
                    <Input placeholder="DD.MM.YY" {...field} value={field.value || ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="deliveryDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('addStockDialog.deliveryDateLabel')}</FormLabel>
                  <FormControl>
                    <Input placeholder="DD.MM.YY" {...field} value={field.value || ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="pt-4">
              <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>{t('addStockDialog.cancel')}</Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('addStockDialog.save')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
