import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Eye } from 'lucide-react';

import {
  useResourceArticles,
  usePublishBlogPost,
  useDeleteBlogPost,
} from '@/hooks/useBlogPosts';
import { useToast } from '@/hooks/use-toast';
import { PageContainer } from '@/components/layout/PageContainer';
import { BlogPostTable } from '@/components/blog/BlogPostTable';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function Resources() {
  const { data: posts, isLoading } = useResourceArticles();
  const publishMutation = usePublishBlogPost();
  const deleteMutation = useDeleteBlogPost();
  const { toast } = useToast();

  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');

  // Apply filters
  const filteredPosts = posts?.filter((p) => {
    if (statusFilter === 'published' && !p.isPublished) return false;
    if (statusFilter === 'draft' && p.isPublished) return false;
    return true;
  });

  const handlePublish = async (id: string, isPublished: boolean) => {
    try {
      await publishMutation.mutateAsync({ id, isPublished });
      toast({
        title: isPublished ? 'Published' : 'Unpublished',
        description: `Resource article has been ${isPublished ? 'published' : 'unpublished'}.`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update resource article status.',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
      toast({
        title: 'Deleted',
        description: 'Resource article has been deleted.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete resource article.',
        variant: 'destructive',
      });
    }
  };

  return (
    <PageContainer
      title="Resources"
      description="Manage M&A guides, articles, and educational content"
      actions={
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <a href="http://localhost:3000/resources" target="_blank" rel="noopener noreferrer">
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </a>
          </Button>
          <Link to="/resources/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Resource
            </Button>
          </Link>
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
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
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
      ) : filteredPosts && filteredPosts.length > 0 ? (
        <BlogPostTable
          posts={filteredPosts}
          onPublish={handlePublish}
          onDelete={handleDelete}
          isDeleting={deleteMutation.isPending}
          isPublishing={publishMutation.isPending}
        />
      ) : (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No resource articles found.</p>
          <Link to="/resources/new">
            <Button variant="outline" className="mt-4">
              <Plus className="mr-2 h-4 w-4" />
              Add your first resource article
            </Button>
          </Link>
        </div>
      )}
    </PageContainer>
  );
}
