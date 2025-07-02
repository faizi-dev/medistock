
'use client';

import { PageHeader } from "@/components/shared/page-header";
import { UsersDataTable } from "@/components/users/data-table";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

export default function UsersPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

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
        title="User Management"
        description="Administer user roles and access for all staff members."
      />
      <UsersDataTable />
    </>
  );
}
