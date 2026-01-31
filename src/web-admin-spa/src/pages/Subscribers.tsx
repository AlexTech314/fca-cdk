import { useState } from 'react';
import { Plus, Download, Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import {
  useSubscribers,
  useCreateSubscriber,
  useDeleteSubscriber,
  useExportSubscribers,
} from '@/hooks/useSubscribers';
import { useToast } from '@/hooks/use-toast';
import { PageContainer } from '@/components/layout/PageContainer';
import { SubscriberTable } from '@/components/email/SubscriberTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const addSubscriberSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  name: z.string().optional(),
  source: z.string().optional(),
});

type AddSubscriberData = z.infer<typeof addSubscriberSchema>;

export default function Subscribers() {
  const { data: subscribers, isLoading } = useSubscribers();
  const createMutation = useCreateSubscriber();
  const deleteMutation = useDeleteSubscriber();
  const exportMutation = useExportSubscribers();
  const { toast } = useToast();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'unsubscribed'>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');

  const form = useForm<AddSubscriberData>({
    resolver: zodResolver(addSubscriberSchema),
    defaultValues: { email: '', name: '', source: 'manual' },
  });

  // Get unique sources for filter
  const sources = subscribers
    ? [...new Set(subscribers.map((s) => s.source).filter(Boolean))]
    : [];

  // Apply filters
  const filteredSubscribers = subscribers?.filter((s) => {
    if (statusFilter === 'active' && !s.isSubscribed) return false;
    if (statusFilter === 'unsubscribed' && s.isSubscribed) return false;
    if (sourceFilter !== 'all' && s.source !== sourceFilter) return false;
    return true;
  });

  const handleAdd = async (data: AddSubscriberData) => {
    try {
      await createMutation.mutateAsync(data);
      toast({
        title: 'Added',
        description: 'Subscriber has been added.',
      });
      setIsAddOpen(false);
      form.reset();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to add subscriber.',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
      toast({
        title: 'Removed',
        description: 'Subscriber has been removed.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to remove subscriber.',
        variant: 'destructive',
      });
    }
  };

  const handleExport = async () => {
    try {
      await exportMutation.mutateAsync();
      toast({
        title: 'Exported',
        description: 'Subscribers have been exported to CSV.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to export subscribers.',
        variant: 'destructive',
      });
    }
  };

  const activeCount = subscribers?.filter((s) => s.isSubscribed).length || 0;
  const totalCount = subscribers?.length || 0;

  return (
    <PageContainer
      title="Subscribers"
      description={`${activeCount} active subscribers of ${totalCount} total`}
      actions={
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport} disabled={exportMutation.isPending}>
            {exportMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Export CSV
          </Button>
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Subscriber
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Subscriber</DialogTitle>
              </DialogHeader>
              <form onSubmit={form.handleSubmit(handleAdd)} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="email@example.com"
                    {...form.register('email')}
                  />
                  {form.formState.errors.email && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.email.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    placeholder="John Doe"
                    {...form.register('name')}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Source</Label>
                  <Select
                    value={form.watch('source')}
                    onValueChange={(v) => form.setValue('source', v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select source" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">Manual</SelectItem>
                      <SelectItem value="website">Website</SelectItem>
                      <SelectItem value="referral">Referral</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsAddOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Add
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
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
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="unsubscribed">Unsubscribed</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sourceFilter} onValueChange={setSourceFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sources</SelectItem>
            {sources.map((source) => (
              <SelectItem key={source} value={source!} className="capitalize">
                {source?.replace('_', ' ')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : filteredSubscribers && filteredSubscribers.length > 0 ? (
        <SubscriberTable
          subscribers={filteredSubscribers}
          onDelete={handleDelete}
          isDeleting={deleteMutation.isPending}
        />
      ) : (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No subscribers found.</p>
        </div>
      )}
    </PageContainer>
  );
}
