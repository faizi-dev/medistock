
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { doc, updateDoc } from 'firebase/firestore';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import type { UserProfile } from '@/types';
import { useLanguage } from '@/context/language-context';

const formSchema = z.object({
  role: z.enum(['Admin', 'Staff']),
});

type RoleFormValues = z.infer<typeof formSchema>;

interface UserRoleDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  user?: UserProfile | null;
  onSuccess: () => void;
}

export function UserRoleDialog({ isOpen, setIsOpen, user, onSuccess }: UserRoleDialogProps) {
  const { toast } = useToast();
  const { t } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<RoleFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { role: user?.role || 'Staff' },
  });

  useEffect(() => {
    if (user) {
      form.reset({ role: user.role });
    }
  }, [user, form]);

  const onSubmit = async (values: RoleFormValues) => {
    if (!user) return;
    setIsLoading(true);
    try {
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, {
        role: values.role,
      });
      onSuccess();
      setIsOpen(false);
    } catch (error) {
      console.error("Error updating role: ", error);
      toast({ 
        variant: 'destructive', 
        title: t('users.toast.roleUpdateError.title'), 
        description: t('users.toast.roleUpdateError.description')
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t('users.roleDialog.title')}</DialogTitle>
          <DialogDescription>
            {t('users.roleDialog.description').replace('{email}', user?.email || '')}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('users.roleDialog.roleLabel')}</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('users.roleDialog.rolePlaceholder')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Staff">{t('users.roleDialog.roleStaff')}</SelectItem>
                      <SelectItem value="Admin">{t('users.roleDialog.roleAdmin')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>{t('users.roleDialog.cancel')}</Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('users.roleDialog.save')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
