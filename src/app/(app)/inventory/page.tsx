
'use client';

import { PageHeader } from "@/components/shared/page-header";
import { InventoryDataTable } from "@/components/inventory/data-table";
import { useLanguage } from "@/context/language-context";
import { Button } from "@/components/ui/button";
import { ListChecks } from "lucide-react";
import Link from "next/link";

export default function InventoryPage() {
  const { t } = useLanguage();
  return (
    <>
      <PageHeader
        title={t('inventory.title')}
      >
        <Button asChild>
          <Link href="/inventory/check">
            <ListChecks className="mr-2 h-4 w-4" />
            {t('inventoryCheck.startCheck.title')}
          </Link>
        </Button>
      </PageHeader>
      <InventoryDataTable />
    </>
  );
}
