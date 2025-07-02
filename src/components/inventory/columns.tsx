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
import type { MedicalItem } from '@/types';
import { format } from 'date-fns';

const getStatus = (item: MedicalItem): { text: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' } => {
  if (item.expirationDate && item.expirationDate.toDate() < new Date()) {
    return { text: 'Expired', variant: 'destructive' };
  }
  if (item.quantity <= item.lowStockThreshold) {
    return { text: 'Low Stock', variant: 'destructive' };
  }
  if (item.expirationDate) {
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    if (item.expirationDate.toDate() < thirtyDaysFromNow) {
      return { text: 'Expiring Soon', variant: 'outline' };
    }
  }
  return { text: 'In Stock', variant: 'secondary' };
};


export const getColumns = (
  vehicles: { id: string; name: string }[],
  onEdit: (item: MedicalItem) => void,
  onDelete: (item: MedicalItem) => void
): ColumnDef<MedicalItem>[] => [
  {
    accessorKey: 'name',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Item Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => <div className="font-medium">{row.getValue('name')}</div>,
  },
  {
    accessorKey: 'vehicleId',
    header: 'Vehicle',
    cell: ({ row }) => {
      const vehicleId = row.getValue('vehicleId') as string;
      const vehicle = vehicles.find((v) => v.id === vehicleId);
      return vehicle ? vehicle.name : 'Unassigned';
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
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
          Quantity
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => <div className="text-center">{row.getValue('quantity')}</div>,
  },
  {
    accessorKey: 'expirationDate',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Expires
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
    header: 'Status',
    cell: ({ row }) => {
      const status = getStatus(row.original);
      return <Badge variant={status.variant}>{status.text}</Badge>;
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
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => onEdit(item)}>
              Edit Item
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => onDelete(item)}
            >
              Delete Item
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
