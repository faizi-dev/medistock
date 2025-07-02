
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/context/language-context';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription as FormDescriptionComponent } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

const emailSettingsSchema = z.object({
  template: z.string().min(10, 'Template cannot be empty.'),
});

type EmailSettingsFormValues = z.infer<typeof emailSettingsSchema>;

const DEFAULT_TEMPLATE = `<h1>MediStock Expiration Alert</h1>
<p>The following items in your inventory are expiring within the next 6 weeks:</p>
<ul>
  {{{itemsListHtml}}}
</ul>
<p>Please review your stock and take appropriate action.</p>
<p>This is an automated notification from your MediStock system.</p>`;

export default function SettingsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { t } = useLanguage();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);

  const form = useForm<EmailSettingsFormValues>({
    resolver: zodResolver(emailSettingsSchema),
    defaultValues: {
      template: '',
    },
  });

  useEffect(() => {
    if (!authLoading) {
      if (!user || user.role !== 'Admin') {
        router.replace('/dashboard');
      } else {
        const fetchSettings = async () => {
          setIsLoading(true);
          const settingsDocRef = doc(db, 'settings', 'email');
          const docSnap = await getDoc(settingsDocRef);
          if (docSnap.exists()) {
            form.reset({ template: docSnap.data().template });
          } else {
            form.reset({ template: DEFAULT_TEMPLATE });
          }
          setIsLoading(false);
        };
        fetchSettings();
      }
    }
  }, [user, authLoading, router, form]);

  const onSubmit = async (values: EmailSettingsFormValues) => {
    if (!user) return;
    setIsLoading(true);
    try {
      const settingsDocRef = doc(db, 'settings', 'email');
      await setDoc(settingsDocRef, {
        template: values.template,
        updatedAt: serverTimestamp(),
        updatedBy: { uid: user.uid, name: user.fullName || user.email },
      }, { merge: true });
      toast({
        title: t('settings.toast.success.title'),
        description: t('settings.toast.success.description'),
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        variant: 'destructive',
        title: t('settings.toast.error.title'),
        description: t('settings.toast.error.description'),
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading || !user || user.role !== 'Admin') {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title={t('settings.title')}
        description={t('settings.description')}
      />
      <Card>
        <CardHeader>
          <CardTitle>{t('settings.email.title')}</CardTitle>
          <CardDescription>{t('settings.email.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="template"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('settings.email.templateLabel')}</FormLabel>
                    {isLoading ? (
                      <Skeleton className="h-48 w-full" />
                    ) : (
                      <FormControl>
                        <Textarea
                          className="min-h-[250px] font-mono text-xs"
                          placeholder={t('settings.email.templatePlaceholder')}
                          {...field}
                        />
                      </FormControl>
                    )}
                    <FormDescriptionComponent>
                      {t('settings.email.templateHint')} <code>{"{{{itemsListHtml}}}"}</code>
                    </FormDescriptionComponent>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end">
                <Button type="submit" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t('settings.saveButton')}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </>
  );
}
