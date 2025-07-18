
'use client';

import { ColumnDef } from '@tanstack/react-table';
import { MoreHorizontal, ArrowUpDown, Truck, Box, Package, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import type { MedicalItem, Vehicle, Case, ModuleBag } from '@/types';
import type { TranslationKey } from '@/lib/translations';
import { format } from 'date-fns';

type Status = {
  key: 'understocked' | 'overstocked' | 'fullyStocked' | 'expiringSoon' | 'expired';
  text: string;
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
};

const getStatuses = (item: MedicalItem, t: (key: TranslationKey) => string): Status[] => {
  const statuses: Status[] = [];
  const now = new Date();
  const batches = Array.isArray(item.batches) ? item.batches : [];

  const isExpired = batches.some(b => b.expirationDate && b.expirationDate.toDate() < now);
  if (isExpired) {
    return [{ key: 'expired', text: t('inventory.status.expired'), variant: 'destructive' }];
  }
  
  if (item.earliestExpiration) {
    const fortyTwoDaysFromNow = new Date();
    fortyTwoDaysFromNow.setDate(fortyTwoDaysFromNow.getDate() + 42);
    if (item.earliestExpiration.toDate() < fortyTwoDaysFromNow) {
      statuses.push({ key: 'expiringSoon', text: t('inventory.status.expiringSoon'), variant: 'outline' });
    }
  }

  const totalQuantity = item.quantity || 0;
  if (totalQuantity < item.targetQuantity) {
    statuses.push({ key: 'understocked', text: t('inventory.status.understocked'), variant: 'destructive' });
  } else if (totalQuantity > item.targetQuantity) {
    statuses.push({ key: 'overstocked', text: t('inventory.status.overstocked'), variant: 'outline' });
  } else {
    statuses.push({ key: 'fullyStocked', text: t('inventory.status.fullyStocked'), variant: 'secondary' });
  }
  
  if (statuses.length > 1) {
    return statuses.filter(status => status.key !== 'fullyStocked');
  }

  return statuses;
};


export const getColumns = (
  vehicleMap: Map<string, Vehicle>,
  caseMap: Map<string, Case>,
  moduleBagMap: Map<string, ModuleBag>,
  onEdit: (item: MedicalItem) => void,
  onDelete: (item: MedicalItem) => void,
  t: (key: TranslationKey) => string
): ColumnDef<MedicalItem>[] => [
  {
    accessorKey: 'name',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          {t('inventory.columns.name')}
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => <div className="font-medium">{row.getValue('name')}</div>,
  },
  {
    id: 'location',
    accessorKey: 'moduleId',
    header: t('inventory.columns.location'),
    cell: ({ row }) => {
      const moduleId = row.getValue('location') as string;
      const moduleBag = moduleBagMap.get(moduleId);
      if (!moduleBag) {
        return <span className="text-muted-foreground">{t('inventory.columns.unassigned')}</span>;
      }

      const caseItem = caseMap.get(moduleBag.caseId);
      const vehicle = caseItem ? vehicleMap.get(caseItem.vehicleId) : null;

      return (
        <div className="flex items-center gap-1.5 whitespace-nowrap">
          {vehicle && (
            <>
              <Truck className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{vehicle.name}</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </>
          )}
          {caseItem && (
            <>
              <Box className="h-4 w-4 text-muted-foreground" />
              <span>{caseItem.name}</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </>
          )}
          <Package className="h-4 w-4 text-muted-foreground" />
          <span>{moduleBag.name}</span>
        </div>
      );
    },
  },
  {
    accessorKey: 'quantity',
    header: ({ column }) => {
         return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          {t('inventory.columns.quantity')}
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const item = row.original;
      const totalQuantity = item.quantity || 0;
      const discrepancy = totalQuantity - item.targetQuantity;
      const discrepancyText = discrepancy > 0 ? `+${discrepancy}` : `${discrepancy}`;
      const discrepancyColor = discrepancy < 0 ? 'text-destructive' : discrepancy > 0 ? 'text-blue-600' : 'text-muted-foreground';

      return (
        <div className="text-center">
            <p className="font-medium">{totalQuantity}</p>
            <p className={`text-xs ${discrepancyColor}`}>
              Target: {item.targetQuantity} ({discrepancyText})
            </p>
        </div>
      );
    },
    sortingFn: (rowA, rowB, columnId) => {
      const numA = rowA.original.quantity || 0;
      const numB = rowB.original.quantity || 0;
      return numA - numB;
    }
  },
  {
    accessorKey: 'earliestExpiration',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          {t('inventory.columns.expires')}
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const date = row.original.earliestExpiration?.toDate();
      if (!date) return 'N/A';
      
      const isNextToExpire = row.original.batches.length > 1;
      return (
        <div>
          <span>{format(date, 'MMM d, yyyy')}</span>
          {isNextToExpire && (
            <div className="text-xs text-muted-foreground">
              {t('inventory.columns.nextToExpire')}
            </div>
          )}
        </div>
      );
    },
    sortingFn: (rowA, rowB, columnId) => {
        const dateA = rowA.original.earliestExpiration?.toDate()?.getTime() || -1;
        const dateB = rowB.original.earliestExpiration?.toDate()?.getTime() || -1;
        if (dateA === -1 && dateB === -1) return 0;
        if (dateA === -1) return 1;
        if (dateB === -1) return -1;
        return dateA - dateB;
    }
  },
  {
    id: 'status',
    header: t('inventory.columns.status'),
    cell: ({ row }) => {
      const statuses = getStatuses(row.original, t);
      if (!statuses.length) return null;

      return (
        <div className="flex flex-wrap gap-1">
          {statuses.map((status) => (
            <Badge key={status.key} variant={status.variant}>
              {status.text}
            </Badge>
          ))}
        </div>
      );
    },
    filterFn: (row, id, value) => {
      if (!value) return true;
      const statusKeys = getStatuses(row.original, t).map((s) => s.key);
      return statusKeys.includes(value as any);
    },
  },
  {
    accessorKey: 'createdAt',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          {t('inventory.columns.added')}
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const { createdBy, createdAt } = row.original;
      const date = createdAt?.toDate();
      const formattedDate = date ? format(date, 'MMM d, yyyy') : 'N/A';
      return (
        <div>
          <div>{createdBy?.name || 'N/A'}</div>
          <div className="text-sm text-muted-foreground">{formattedDate}</div>
        </div>
      );
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const item = row.original;
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{t('inventory.columns.actions')}</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => onEdit(item)}>
              {t('inventory.actions.edit')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => onDelete(item)}
            >
              {t('inventory.actions.delete')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
