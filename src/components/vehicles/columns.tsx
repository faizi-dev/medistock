
'use client';

import { ColumnDef } from '@tanstack/react-table';
import { MoreHorizontal, ArrowUpDown } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Vehicle } from '@/types';
import type { TranslationKey } from '@/lib/translations';
import { format } from 'date-fns';

export const getColumns = (
  onEdit: (vehicle: Vehicle) => void,
  onDelete: (vehicle: Vehicle) => void,
  t: (key: TranslationKey) => string
): ColumnDef<Vehicle>[] => [
  {
    accessorKey: 'name',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          {t('vehicles.columns.name')}
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      return (
        <div className="pl-4">
            <Link href={`/vehicles/${row.original.id}`} className="font-medium text-primary hover:underline">
            {row.getValue('name')}
            </Link>
        </div>
      );
    }
  },
  {
    accessorKey: 'createdBy.name',
    header: t('vehicles.columns.addedBy'),
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
          {t('vehicles.columns.addedAt')}
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
      const vehicle = row.original;
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{t('vehicles.columns.actions')}</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => onEdit(vehicle)}>
              {t('vehicles.actions.edit')}
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/vehicles/${vehicle.id}`}>{t('vehicles.actions.viewInventory')}</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => onDelete(vehicle)}
            >
              {t('vehicles.actions.delete')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
