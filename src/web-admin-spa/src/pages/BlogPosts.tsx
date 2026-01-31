import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';

import {
  useBlogPosts,
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

export default function BlogPosts() {
  const { data: posts, isLoading } = useBlogPosts();
  const publishMutation = usePublishBlogPost();
  const deleteMutation = useDeleteBlogPost();
  const { toast } = useToast();

  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Get unique categories for filter
  const categories = posts
    ? [...new Set(posts.map((p) => p.category).filter(Boolean))]
    : [];

  // Apply filters
  const filteredPosts = posts?.filter((p) => {
    if (statusFilter === 'published' && !p.isPublished) return false;
    if (statusFilter === 'draft' && p.isPublished) return false;
    if (categoryFilter !== 'all' && p.category !== categoryFilter) return false;
    return true;
  });

  const handlePublish = async (id: string, isPublished: boolean) => {
    try {
      await publishMutation.mutateAsync({ id, isPublished });
      toast({
        title: isPublished ? 'Published' : 'Unpublished',
        description: `Blog post has been ${isPublished ? 'published' : 'unpublished'}.`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update blog post status.',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
      toast({
        title: 'Deleted',
        description: 'Blog post has been deleted.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete blog post.',
        variant: 'destructive',
      });
    }
  };

  return (
    <PageContainer
      title="Blog Posts"
      description="Manage news articles and resources"
      actions={
        <Link to="/content/blog/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Blog Post
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

        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category} value={category!} className="capitalize">
                {category}
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
          <p className="text-muted-foreground">No blog posts found.</p>
          <Link to="/content/blog/new">
            <Button variant="outline" className="mt-4">
              <Plus className="mr-2 h-4 w-4" />
              Add your first blog post
            </Button>
          </Link>
        </div>
      )}
    </PageContainer>
  );
}
