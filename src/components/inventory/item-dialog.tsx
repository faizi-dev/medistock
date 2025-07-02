'use client';

import { useState, useEffect } from 'react';
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
  const [isLoading, setIsLoading] = useState(false);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);

  useEffect(() => {
    async function fetchVehicles() {
      const vehiclesSnapshot = await getDocs(collection(db, 'vehicles'));
      const vehiclesList = vehiclesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Vehicle);
      setVehicles(vehiclesList);
    }
    fetchVehicles();
  }, []);

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
  }, [item, form]);

  const onSubmit = async (values: ItemFormValues) => {
    setIsLoading(true);
    try {
      const itemData: Omit<MedicalItem, 'id'> = {
        ...values,
        expirationDate: values.expirationDate ? Timestamp.fromDate(values.expirationDate) : Timestamp.now(),
        // Add other required fields if any
      };
      
      if (item) {
        await setDoc(doc(db, 'items', item.id), itemData, { merge: true });
        toast({ title: 'Item Updated', description: `${values.name} has been updated.` });
      } else {
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
          <DialogTitle>{item ? 'Edit Item' : 'Add New Item'}</DialogTitle>
          <DialogDescription>
            {item ? 'Update the details of the medical supply.' : 'Fill in the details for the new medical supply.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Item Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Band-Aids" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="vehicleId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vehicle</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Assign to a vehicle" />
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
                    <FormLabel>Quantity</FormLabel>
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
                    <FormLabel>Low Stock Threshold</FormLabel>
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
                  <FormLabel>Expiration Date</FormLabel>
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
                            <span>Pick a date</span>
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
                  <FormLabel>Barcode (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Scan or enter barcode" {...field} />
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
