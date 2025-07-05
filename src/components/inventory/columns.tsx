
'use client';

import { ColumnDef } from '@tanstack/react-table';
import { MoreHorizontal, ArrowUpDown } from 'lucide-react';
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

  if (item.expirationDate && item.expirationDate.toDate() < new Date()) {
    return [{ key: 'expired', text: t('inventory.status.expired'), variant: 'destructive' }];
  }
  
  if (item.expirationDate) {
    const fortyTwoDaysFromNow = new Date();
    fortyTwoDaysFromNow.setDate(fortyTwoDaysFromNow.getDate() + 42);
    if (item.expirationDate.toDate() < fortyTwoDaysFromNow) {
      statuses.push({ key: 'expiringSoon', text: t('inventory.status.expiringSoon'), variant: 'outline' });
    }
  }

  if (item.quantity < item.targetQuantity) {
    statuses.push({ key: 'understocked', text: t('inventory.status.understocked'), variant: 'destructive' });
  } else if (item.quantity > item.targetQuantity) {
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
      if (!moduleBag) return t('inventory.columns.unassigned');

      const caseItem = caseMap.get(moduleBag.caseId);
      if (!caseItem) return moduleBag.name;

      const vehicle = vehicleMap.get(caseItem.vehicleId);
      if (!vehicle) return `${caseItem.name} > ${moduleBag.name}`;
      
      return `${vehicle.name} > ${caseItem.name} > ${moduleBag.name}`;
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
      const discrepancy = item.quantity - item.targetQuantity;
      const discrepancyText = discrepancy > 0 ? `+${discrepancy}` : `${discrepancy}`;
      const discrepancyColor = discrepancy < 0 ? 'text-destructive' : discrepancy > 0 ? 'text-blue-600' : 'text-muted-foreground';

      return (
        <div className="text-center">
            <p className="font-medium">{item.quantity}</p>
            <p className={`text-xs ${discrepancyColor}`}>
              Target: {item.targetQuantity} ({discrepancyText})
            </p>
        </div>
      );
    },
  },
  {
    accessorKey: 'expirationDate',
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
      const date = row.original.expirationDate?.toDate();
      return date ? format(date, 'MMM d, yyyy') : 'N/A';
    },
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
    accessorKey: 'createdBy',
    header: t('inventory.columns.addedBy'),
    cell: ({ row }) => row.original.createdBy?.name || 'N/A',
  },
  {
    accessorKey: 'createdAt',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          {t('inventory.columns.addedAt')}
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const date = row.original.createdAt?.toDate();
      return date ? format(date, 'MMM d, yyyy') : 'N/A';
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
