import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { RoleBadge } from './RoleBadge';
import type { User } from '@/types';
import { formatRelativeTime } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useUpdateUserRole, useRemoveUser } from '@/hooks/useUsers';
import { MoreHorizontal, Shield, Edit, Eye, Trash2 } from 'lucide-react';

interface UserTableProps {
  users: User[];
  isLoading: boolean;
}

export function UserTable({ users, isLoading }: UserTableProps) {
  const { user: currentUser } = useAuth();
  const updateRoleMutation = useUpdateUserRole();
  const removeMutation = useRemoveUser();

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  const handleRoleChange = (userId: string, role: User['role']) => {
    updateRoleMutation.mutate({ id: userId, role });
  };

  const handleRemove = (userId: string) => {
    if (confirm('Are you sure you want to remove this user?')) {
      removeMutation.mutate(userId);
    }
  };

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Email</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Last Active</TableHead>
            <TableHead className="w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => {
            const isCurrentUser = user.id === currentUser?.id;
            
            return (
              <TableRow key={user.id} className="hover:bg-muted/50">
                <TableCell className="font-medium">{user.email}</TableCell>
                <TableCell className="text-muted-foreground">
                  {user.name || '-'}
                </TableCell>
                <TableCell>
                  <RoleBadge role={user.role} showIcon />
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {user.lastActiveAt ? formatRelativeTime(user.lastActiveAt) : 'Never'}
                </TableCell>
                <TableCell>
                  {!isCurrentUser && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => handleRoleChange(user.id, 'admin')}
                          disabled={user.role === 'admin'}
                        >
                          <Shield className="mr-2 h-4 w-4" />
                          Make Admin
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleRoleChange(user.id, 'readwrite')}
                          disabled={user.role === 'readwrite'}
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          Make Read/Write
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleRoleChange(user.id, 'readonly')}
                          disabled={user.role === 'readonly'}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          Make Read Only
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleRemove(user.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Remove User
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
