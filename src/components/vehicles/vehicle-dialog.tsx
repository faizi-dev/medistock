'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { addDoc, collection, doc, setDoc } from 'firebase/firestore';
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
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<VehicleFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: vehicle ? { name: vehicle.name } : { name: '' },
  });

  useEffect(() => {
    if (vehicle) {
      form.reset({ name: vehicle.name });
    } else {
      form.reset({ name: '' });
    }
  }, [vehicle, form]);

  const onSubmit = async (values: VehicleFormValues) => {
    setIsLoading(true);
    try {
      if (vehicle) {
        await setDoc(doc(db, 'vehicles', vehicle.id), values, { merge: true });
        toast({ title: 'Vehicle Updated', description: `Vehicle "${values.name}" has been updated.` });
      } else {
        await addDoc(collection(db, 'vehicles'), values);
        toast({ title: 'Vehicle Added', description: `Vehicle "${values.name}" has been added.` });
      }
      onSuccess();
      setIsOpen(false);
    } catch (error) {
      console.error("Error saving vehicle: ", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not save the vehicle. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{vehicle ? 'Edit Vehicle' : 'Add New Vehicle'}</DialogTitle>
          <DialogDescription>
            {vehicle ? 'Update the vehicle details.' : 'Fill in the details for the new vehicle.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vehicle Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Ambulance A-101" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
