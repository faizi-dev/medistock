
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
import type { UserProfile } from '@/types';
import { useAuth } from '@/hooks/use-auth';

const ActionsCell = ({ row, onEditRole, onDelete }: {
  row: any;
  onEditRole: (user: UserProfile) => void;
  onDelete: (user: UserProfile) => void;
}) => {
  const { user: currentUser } = useAuth();
  const user = row.original as UserProfile;
  const isCurrentUser = currentUser?.uid === user.uid;

  if (isCurrentUser) {
    return (
      <div className="text-right">
        <span className="px-4 text-sm text-muted-foreground">(You)</span>
      </div>
    );
  }

  return (
    <div className="text-right">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => onEditRole(user)}>
            Change Role
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={() => onDelete(user)}
          >
            Delete User Record
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export const getColumns = (
  onEditRole: (user: UserProfile) => void,
  onDelete: (user: UserProfile) => void
): ColumnDef<UserProfile>[] => [
  {
    accessorKey: 'email',
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        Email
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => <div className="font-medium pl-4">{row.getValue('email')}</div>,
  },
  {
    accessorKey: 'role',
    header: 'Role',
    cell: ({ row }) => {
      const role = row.getValue('role') as string;
      return <Badge variant={role === 'Admin' ? 'default' : 'secondary'}>{role}</Badge>;
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => <ActionsCell row={row} onEditRole={onEditRole} onDelete={onDelete} />,
  },
];
