
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
import type { TranslationKey } from '@/lib/translations';

const ActionsCell = ({ row, onEditRole, onDelete, t }: {
  row: any;
  onEditRole: (user: UserProfile) => void;
  onDelete: (user: UserProfile) => void;
  t: (key: TranslationKey) => string;
}) => {
  const { user: currentUser } = useAuth();
  const user = row.original as UserProfile;
  const isCurrentUser = currentUser?.uid === user.uid;

  if (isCurrentUser) {
    return (
      <div className="text-right">
        <span className="px-4 text-sm text-muted-foreground">{t('users.actions.currentUserLabel')}</span>
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
          <DropdownMenuLabel>{t('users.columns.actions')}</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => onEditRole(user)}>
            {t('users.actions.changeRole')}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={() => onDelete(user)}
          >
            {t('users.actions.delete')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export const getColumns = (
  onEditRole: (user: UserProfile) => void,
  onDelete: (user: UserProfile) => void,
  t: (key: TranslationKey) => string
): ColumnDef<UserProfile>[] => [
  {
    accessorKey: 'email',
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        {t('users.columns.email')}
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => <div className="font-medium pl-4">{row.getValue('email')}</div>,
  },
  {
    accessorKey: 'role',
    header: t('users.columns.role'),
    cell: ({ row }) => {
      const role = row.getValue('role') as string;
      const roleText = role === 'Admin' ? t('users.roleDialog.roleAdmin') : t('users.roleDialog.roleStaff');
      return <Badge variant={role === 'Admin' ? 'default' : 'secondary'}>{roleText}</Badge>;
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => <ActionsCell row={row} onEditRole={onEditRole} onDelete={onDelete} t={t} />,
  },
];
