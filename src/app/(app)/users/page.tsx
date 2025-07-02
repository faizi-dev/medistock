
'use client';

import { PageHeader } from "@/components/shared/page-header";
import { UsersDataTable } from "@/components/users/data-table";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useLanguage } from "@/context/language-context";

export default function UsersPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { t } = useLanguage();

  useEffect(() => {
    if (!loading && user?.role !== 'Admin') {
      router.replace('/dashboard');
    }
  }, [user, loading, router]);

  if (loading || user?.role !== 'Admin') {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title={t('users.title')}
        description={t('users.description')}
      />
      <UsersDataTable />
    </>
  );
}
