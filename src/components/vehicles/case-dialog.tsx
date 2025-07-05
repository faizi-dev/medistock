
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
import type { Case } from '@/types';
import { useLanguage } from '@/context/language-context';
import { useAuth } from '@/hooks/use-auth';

const formSchema = z.object({
  name: z.string().min(1, 'Case name is required'),
});

type CaseFormValues = z.infer<typeof formSchema>;

interface CaseDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  caseData?: Case | null;
  vehicleId: string;
  onSuccess: () => void;
}

export function CaseDialog({ isOpen, setIsOpen, caseData, vehicleId, onSuccess }: CaseDialogProps) {
  const { toast } = useToast();
  const { t } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const { user: authUser } = useAuth();

  const form = useForm<CaseFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: '' },
  });

  useEffect(() => {
    if (isOpen) {
        form.reset(caseData ? { name: caseData.name } : { name: '' });
    }
  }, [isOpen, caseData, form]);


  const onSubmit = async (values: CaseFormValues) => {
    setIsLoading(true);
    try {
      if (!authUser) {
        toast({ variant: 'destructive', title: 'Authentication Error', description: 'You must be logged in.' });
        setIsLoading(false);
        return;
      }
      
      if (caseData) {
        const data = {
          ...values,
          updatedAt: serverTimestamp(),
          updatedBy: { uid: authUser.uid, name: authUser.fullName || authUser.email }
        }
        await setDoc(doc(db, 'cases', caseData.id), data, { merge: true });
        toast({ title: 'Case Updated', description: `Case "${values.name}" has been updated.`});
      } else {
        const data = {
          ...values,
          vehicleId,
          createdAt: serverTimestamp(),
          createdBy: { uid: authUser.uid, name: authUser.fullName || authUser.email }
        }
        await addDoc(collection(db, 'cases'), data);
        toast({ title: 'Case Added', description: `Case "${values.name}" has been added.`});
      }
      onSuccess();
      setIsOpen(false);
    } catch (error) {
      console.error("Error saving case: ", error);
      toast({ 
        variant: 'destructive', 
        title: 'Error',
        description: 'Could not save the case. Please try again.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{caseData ? t('caseDialog.editTitle') : t('caseDialog.addTitle')}</DialogTitle>
          <DialogDescription>
            {caseData ? t('caseDialog.editDescription') : t('caseDialog.addDescription')}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('caseDialog.nameLabel')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('caseDialog.namePlaceholder')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>{t('caseDialog.cancel')}</Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('caseDialog.save')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
