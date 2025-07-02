import { PageHeader } from "@/components/shared/page-header";
import { InventoryDataTable } from "@/components/inventory/data-table";

export default function InventoryPage() {
  return (
    <>
      <PageHeader
        title="Inventory Management"
        description="Track, add, and manage all your medical supplies."
      />
      <InventoryDataTable />
    </>
  );
}
