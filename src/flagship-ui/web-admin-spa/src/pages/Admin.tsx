import { useState } from 'react';
import { PageContainer } from '@/components/layout/PageContainer';
import { UserTable } from '@/components/admin/UserTable';
import { InviteUserDialog } from '@/components/admin/InviteUserDialog';
import { Button } from '@/components/ui/button';
import { useUsers, useInviteUser } from '@/hooks/useUsers';
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { UserPlus } from 'lucide-react';
import type { InviteUserInput } from '@/types';

export default function Admin() {
  const { isAdmin, isLoading: authLoading } = useAuth();
  const { data: users, isLoading } = useUsers();
  const inviteMutation = useInviteUser();
  const [showInviteDialog, setShowInviteDialog] = useState(false);

  // Redirect non-admins
  if (!authLoading && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  const handleInvite = async (data: InviteUserInput) => {
    await inviteMutation.mutateAsync(data);
    setShowInviteDialog(false);
  };

  return (
    <PageContainer 
      title="Team Management"
      description="Manage team members and their permissions"
      actions={
        <Button onClick={() => setShowInviteDialog(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Invite User
        </Button>
      }
    >
      <UserTable 
        users={users || []} 
        isLoading={isLoading} 
      />

      <InviteUserDialog
        open={showInviteDialog}
        onOpenChange={setShowInviteDialog}
        onInvite={handleInvite}
        isLoading={inviteMutation.isPending}
      />
    </PageContainer>
  );
}
