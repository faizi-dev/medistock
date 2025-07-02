import { PageHeader } from "@/components/shared/page-header";
import { VehiclesDataTable } from "@/components/vehicles/data-table";

export default function VehiclesPage() {
  return (
    <>
      <PageHeader
        title="Vehicle Management"
        description="Manage your fleet and their assigned inventories."
      />
      <VehiclesDataTable />
    </>
  );
}
