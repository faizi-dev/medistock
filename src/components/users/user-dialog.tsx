
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
import { Input } from '@/components/ui/input';
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
  fullName: z.string().min(1, 'Full name is required.'),
  role: z.enum(['Admin', 'Staff']),
  phone: z.string().optional(),
});

type UserFormValues = z.infer<typeof formSchema>;

interface UserDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  user?: UserProfile | null;
  onSuccess: () => void;
}

export function UserDialog({ isOpen, setIsOpen, user, onSuccess }: UserDialogProps) {
  const { toast } = useToast();
  const { t } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<UserFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { fullName: user?.fullName || '', role: user?.role || 'Staff', phone: user?.phone || '' },
  });

  useEffect(() => {
    if (user) {
      form.reset({ fullName: user.fullName || '', role: user.role, phone: user.phone || '' });
    }
  }, [user, form]);

  const onSubmit = async (values: UserFormValues) => {
    if (!user) return;
    setIsLoading(true);
    try {
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, {
        fullName: values.fullName,
        role: values.role,
        phone: values.phone || '',
      });
      onSuccess();
      setIsOpen(false);
    } catch (error) {
      console.error("Error updating user: ", error);
      toast({ 
        variant: 'destructive', 
        title: t('users.toast.userUpdateError.title'), 
        description: t('users.toast.userUpdateError.description')
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t('users.userDialog.title')}</DialogTitle>
          <DialogDescription>
            {t('users.userDialog.description').replace('{email}', user?.email || '')}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
             <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>{t('users.userDialog.fullNameLabel')}</FormLabel>
                    <FormControl>
                        <Input placeholder={t('users.userDialog.fullNamePlaceholder')} {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
             <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>{t('users.userDialog.phoneLabel')}</FormLabel>
                    <FormControl>
                        <Input placeholder={t('users.userDialog.phonePlaceholder')} {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('users.userDialog.roleLabel')}</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('users.userDialog.rolePlaceholder')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Staff">{t('users.userDialog.roleStaff')}</SelectItem>
                      <SelectItem value="Admin">{t('users.userDialog.roleAdmin')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>{t('users.userDialog.cancel')}</Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('users.userDialog.save')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
