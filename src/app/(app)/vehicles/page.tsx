'use client';

import { PageHeader } from "@/components/shared/page-header";
import { VehiclesDataTable } from "@/components/vehicles/data-table";
import { useLanguage } from "@/context/language-context";

export default function VehiclesPage() {
  const { t } = useLanguage();
  return (
    <>
      <PageHeader
        title={t('vehicles.title')}
        description={t('vehicles.description')}
      />
      <VehiclesDataTable />
    </>
  );
}
