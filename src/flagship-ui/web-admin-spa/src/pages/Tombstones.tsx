import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';

import {
  useTombstones,
  usePublishTombstone,
  useDeleteTombstone,
} from '@/hooks/useTombstones';
import { useToast } from '@/hooks/use-toast';
import { PageContainer } from '@/components/layout/PageContainer';
import { TombstoneTable } from '@/components/tombstones/TombstoneTable';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function Tombstones() {
  const { data: tombstones, isLoading } = useTombstones();
  const publishMutation = usePublishTombstone();
  const deleteMutation = useDeleteTombstone();
  const { toast } = useToast();

  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');
  const [industryFilter, setIndustryFilter] = useState<string>('all');

  // Get unique industries for filter
  const industries = tombstones
    ? [...new Set(tombstones.map((t) => t.industry).filter(Boolean))]
    : [];

  // Apply filters
  const filteredTombstones = tombstones?.filter((t) => {
    if (statusFilter === 'published' && !t.isPublished) return false;
    if (statusFilter === 'draft' && t.isPublished) return false;
    if (industryFilter !== 'all' && t.industry !== industryFilter) return false;
    return true;
  });

  const handlePublish = async (id: string, isPublished: boolean) => {
    try {
      await publishMutation.mutateAsync({ id, isPublished });
      toast({
        title: isPublished ? 'Published' : 'Unpublished',
        description: `Tombstone has been ${isPublished ? 'published' : 'unpublished'}.`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update tombstone status.',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
      toast({
        title: 'Deleted',
        description: 'Tombstone has been deleted.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete tombstone.',
        variant: 'destructive',
      });
    }
  };

  return (
    <PageContainer
      title="Transactions"
      description="Manage closed deal tombstones displayed on the website"
      actions={
        <Link to="/transactions/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Transaction
          </Button>
        </Link>
      }
    >
      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
          </SelectContent>
        </Select>

        <Select value={industryFilter} onValueChange={setIndustryFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Industry" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Industries</SelectItem>
            {industries.map((industry) => (
              <SelectItem key={industry} value={industry!}>
                {industry}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : filteredTombstones && filteredTombstones.length > 0 ? (
        <TombstoneTable
          tombstones={filteredTombstones}
          onPublish={handlePublish}
          onDelete={handleDelete}
          isDeleting={deleteMutation.isPending}
          isPublishing={publishMutation.isPending}
        />
      ) : (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No transactions found.</p>
          <Link to="/transactions/new">
            <Button variant="outline" className="mt-4">
              <Plus className="mr-2 h-4 w-4" />
              Add your first transaction
            </Button>
          </Link>
        </div>
      )}
    </PageContainer>
  );
}
