'use client';

import { useEffect } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { createUser } from '@/actions/user-actions';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { useLanguage } from '@/context/language-context';

interface CreateUserDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

function SubmitButton() {
    const { pending } = useFormStatus();
    const { t } = useLanguage();
    return (
        <Button type="submit" disabled={pending}>
            {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('users.createUserDialog.createButton')}
        </Button>
    );
}

export function CreateUserDialog({ isOpen, setIsOpen }: CreateUserDialogProps) {
  const { toast } = useToast();
  const { t } = useLanguage();
  
  const [state, formAction] = useFormState(createUser, { type: null, message: '', errors: null });

  useEffect(() => {
    if (state?.type === 'success') {
        toast({ title: t('users.toast.userCreated.title'), description: state.message });
        setIsOpen(false);
    } else if (state?.type === 'error') {
        toast({ variant: 'destructive', title: t('users.toast.userCreateError.title'), description: state.message });
    }
  }, [state, toast, setIsOpen, t]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t('users.createUserDialog.title')}</DialogTitle>
          <DialogDescription>{t('users.createUserDialog.description')}</DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-4 py-4" key={isOpen ? 'open' : 'closed'}>
            <div className="space-y-2">
                <Label htmlFor="email">{t('users.createUserDialog.emailLabel')}</Label>
                <Input id="email" name="email" type="email" placeholder={t('users.createUserDialog.emailPlaceholder')} required />
                {state?.errors?.email && <p className="text-sm font-medium text-destructive">{state.errors.email[0]}</p>}
            </div>
            <div className="space-y-2">
                <Label htmlFor="password">{t('users.createUserDialog.passwordLabel')}</Label>
                <Input id="password" name="password" type="password" required />
                {state?.errors?.password && <p className="text-sm font-medium text-destructive">{state.errors.password[0]}</p>}
            </div>
            <div className="space-y-2">
                <Label htmlFor="phone">{t('users.userDialog.phoneLabel')}</Label>
                <Input id="phone" name="phone" placeholder={t('users.userDialog.phonePlaceholder')} />
            </div>
            <div className="space-y-2">
                <Label htmlFor="role">{t('users.userDialog.roleLabel')}</Label>
                <Select name="role" defaultValue="Staff">
                    <SelectTrigger>
                        <SelectValue placeholder={t('users.userDialog.rolePlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Staff">{t('users.userDialog.roleStaff')}</SelectItem>
                      <SelectItem value="Admin">{t('users.userDialog.roleAdmin')}</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>{t('users.createUserDialog.cancel')}</Button>
              <SubmitButton />
            </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
