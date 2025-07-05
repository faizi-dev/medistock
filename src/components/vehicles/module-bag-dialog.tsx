
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
import type { ModuleBag } from '@/types';
import { useLanguage } from '@/context/language-context';
import { useAuth } from '@/hooks/use-auth';

const formSchema = z.object({
  name: z.string().min(1, 'Module bag name is required'),
});

type ModuleBagFormValues = z.infer<typeof formSchema>;

interface ModuleBagDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  moduleData?: ModuleBag | null;
  caseId?: string;
  onSuccess: () => void;
}

export function ModuleBagDialog({ isOpen, setIsOpen, moduleData, caseId, onSuccess }: ModuleBagDialogProps) {
  const { toast } = useToast();
  const { t } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const { user: authUser } = useAuth();

  const form = useForm<ModuleBagFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: '' },
  });

  useEffect(() => {
    if (isOpen) {
        form.reset(moduleData ? { name: moduleData.name } : { name: '' });
    }
  }, [isOpen, moduleData, form]);

  const onSubmit = async (values: ModuleBagFormValues) => {
    setIsLoading(true);
    try {
      if (!authUser) {
        toast({ variant: 'destructive', title: 'Authentication Error', description: 'You must be logged in.' });
        setIsLoading(false);
        return;
      }
      if (!caseId) {
        toast({ variant: 'destructive', title: 'Error', description: 'Module bag must be associated with a case.' });
        setIsLoading(false);
        return;
      }
      
      if (moduleData) {
        const data = {
          ...values,
          updatedAt: serverTimestamp(),
          updatedBy: { uid: authUser.uid, name: authUser.fullName || authUser.email }
        }
        await setDoc(doc(db, 'moduleBags', moduleData.id), data, { merge: true });
        toast({ title: 'Module Bag Updated', description: `Module Bag "${values.name}" has been updated.`});
      } else {
        const data = {
          ...values,
          caseId,
          createdAt: serverTimestamp(),
          createdBy: { uid: authUser.uid, name: authUser.fullName || authUser.email }
        }
        await addDoc(collection(db, 'moduleBags'), data);
        toast({ title: 'Module Bag Added', description: `Module Bag "${values.name}" has been added.`});
      }
      onSuccess();
      setIsOpen(false);
    } catch (error) {
      console.error("Error saving module bag: ", error);
      toast({ 
        variant: 'destructive', 
        title: 'Error',
        description: 'Could not save the module bag. Please try again.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{moduleData ? t('moduleDialog.editTitle') : t('moduleDialog.addTitle')}</DialogTitle>
          <DialogDescription>
            {moduleData ? t('moduleDialog.editDescription') : t('moduleDialog.addDescription')}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('moduleDialog.nameLabel')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('moduleDialog.namePlaceholder')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>{t('moduleDialog.cancel')}</Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('moduleDialog.save')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
