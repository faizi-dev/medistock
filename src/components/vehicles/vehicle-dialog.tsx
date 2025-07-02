
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { addDoc, collection, doc, serverTimestamp, setDoc } from 'firebase/firestore';
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
import { Loader2 } from 'lucide-react';
import type { Vehicle } from '@/types';
import { useLanguage } from '@/context/language-context';
import { useAuth } from '@/hooks/use-auth';

const formSchema = z.object({
  name: z.string().min(1, 'Vehicle name is required'),
});

type VehicleFormValues = z.infer<typeof formSchema>;

interface VehicleDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  vehicle?: Vehicle | null;
  onSuccess: () => void;
}

export function VehicleDialog({ isOpen, setIsOpen, vehicle, onSuccess }: VehicleDialogProps) {
  const { toast } = useToast();
  const { t } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const { user: authUser } = useAuth();

  const form = useForm<VehicleFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: vehicle ? { name: vehicle.name } : { name: '' },
  });

  useEffect(() => {
    if (!isOpen) {
      form.reset(vehicle ? { name: vehicle.name } : { name: '' });
    }
  }, [isOpen, vehicle, form]);


  const onSubmit = async (values: VehicleFormValues) => {
    setIsLoading(true);
    try {
      if (!authUser) {
        toast({ variant: 'destructive', title: 'Authentication Error', description: 'You must be logged in.' });
        setIsLoading(false);
        return;
      }
      
      if (vehicle) {
        const vehicleData = {
          ...values,
          updatedAt: serverTimestamp(),
          updatedBy: { uid: authUser.uid, name: authUser.fullName || authUser.email }
        }
        await setDoc(doc(db, 'vehicles', vehicle.id), vehicleData, { merge: true });
        toast({ 
          title: t('vehicles.toast.updated.title'), 
          description: t('vehicles.toast.updated.description').replace('{vehicleName}', values.name)
        });
      } else {
        const vehicleData = {
          ...values,
          createdAt: serverTimestamp(),
          createdBy: { uid: authUser.uid, name: authUser.fullName || authUser.email }
        }
        await addDoc(collection(db, 'vehicles'), vehicleData);
        toast({ 
          title: t('vehicles.toast.added.title'), 
          description: t('vehicles.toast.added.description').replace('{vehicleName}', values.name)
        });
      }
      onSuccess();
      setIsOpen(false);
    } catch (error) {
      console.error("Error saving vehicle: ", error);
      toast({ 
        variant: 'destructive', 
        title: t('vehicles.toast.saveError.title'), 
        description: t('vehicles.toast.saveError.description')
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{vehicle ? t('vehicles.dialog.editTitle') : t('vehicles.dialog.addTitle')}</DialogTitle>
          <DialogDescription>
            {vehicle ? t('vehicles.dialog.editDescription') : t('vehicles.dialog.addDescription')}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('vehicles.dialog.nameLabel')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('vehicles.dialog.namePlaceholder')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>{t('vehicles.dialog.cancel')}</Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('vehicles.dialog.save')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
