'use client';

import { PageHeader } from "@/components/shared/page-header";
import { InventoryDataTable } from "@/components/inventory/data-table";
import { useLanguage } from "@/context/language-context";

export default function InventoryPage() {
  const { t } = useLanguage();
  return (
    <>
      <PageHeader
        title={t('inventory.title')}
        description={t('inventory.description')}
      />
      <InventoryDataTable />
    </>
  );
}
