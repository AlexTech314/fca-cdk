import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Loader2, ExternalLink } from 'lucide-react';

import {
  useBlogPost,
  useCreateBlogPost,
  useUpdateBlogPost,
} from '@/hooks/useBlogPosts';
import { usePage, useUpdatePage } from '@/hooks/usePages';
import { useToast } from '@/hooks/use-toast';
import { slugify } from '@/lib/utils';
import { BlockNoteEditor } from '@/components/blog/BlockNoteEditor';
import { ContentSidebar } from '@/components/layout/ContentSidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// Blog post schema
const blogPostSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  slug: z.string().optional(),
  excerpt: z.string().optional(),
  content: z.string().min(1, 'Content is required'),
  author: z.string().optional(),
  category: z.string().optional(),
  isPublished: z.boolean().default(false),
});

type BlogPostFormData = z.infer<typeof blogPostSchema>;

// Page schema
const pageSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  content: z.string(),
  subtitle: z.string().optional(),
  description: z.string().optional(),
  ctaTitle: z.string().optional(),
  ctaDescription: z.string().optional(),
  ctaText: z.string().optional(),
  ctaHref: z.string().optional(),
});

type PageFormData = z.infer<typeof pageSchema>;

const categories = ['news', 'resource', 'article'];
const authors = ['John Smith', 'Jane Doe'];

export default function ContentEditor() {
  const navigate = useNavigate();
  const { type, id } = useParams<{ type: string; id: string }>();
  const { toast } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const contentRef = useRef<string>('');

  const isBlog = type === 'blog';
  const isPage = type === 'page';
  const isNew = id === 'new';

  // Blog post hooks
  const { data: blogPost, isLoading: isLoadingBlog } = useBlogPost(
    isBlog && !isNew ? id : undefined
  );
  const createBlogMutation = useCreateBlogPost();
  const updateBlogMutation = useUpdateBlogPost();

  // Page hooks
  const { data: page, isLoading: isLoadingPage } = usePage(
    isPage ? id : undefined
  );
  const updatePageMutation = useUpdatePage();

  // Blog form
  const blogForm = useForm<BlogPostFormData>({
    resolver: zodResolver(blogPostSchema),
    defaultValues: {
      title: '',
      slug: '',
      excerpt: '',
      content: '',
      author: '',
      category: '',
      isPublished: false,
    },
  });

  // Page form
  const pageForm = useForm<PageFormData>({
    resolver: zodResolver(pageSchema),
    defaultValues: {
      title: '',
      content: '',
      subtitle: '',
      description: '',
      ctaTitle: '',
      ctaDescription: '',
      ctaText: '',
      ctaHref: '',
    },
  });

  // Load blog post data
  useEffect(() => {
    if (blogPost && isBlog) {
      blogForm.reset({
        title: blogPost.title,
        slug: blogPost.slug,
        excerpt: blogPost.excerpt || '',
        content: blogPost.content,
        author: blogPost.author || '',
        category: blogPost.category || '',
        isPublished: blogPost.isPublished,
      });
      contentRef.current = blogPost.content;
    }
  }, [blogPost, isBlog, blogForm]);

  // Load page data
  useEffect(() => {
    if (page && isPage) {
      const meta = (page.metadata || {}) as Record<string, unknown>;
      pageForm.reset({
        title: page.title,
        content: page.content || '',
        subtitle: (meta.subtitle as string) || '',
        description: (meta.description as string) || '',
        ctaTitle: (meta.ctaTitle as string) || '',
        ctaDescription: (meta.ctaDescription as string) || '',
        ctaText: (meta.ctaText as string) || '',
        ctaHref: (meta.ctaHref as string) || '',
      });
      contentRef.current = page.content || '';
    }
  }, [page, isPage, pageForm]);

  // Auto-generate slug from title for new blog posts
  const watchBlogTitle = blogForm.watch('title');
  useEffect(() => {
    if (isBlog && isNew && watchBlogTitle) {
      const slug = slugify(watchBlogTitle);
      blogForm.setValue('slug', slug);
    }
  }, [watchBlogTitle, isBlog, isNew, blogForm]);

  // Handle content change
  const handleContentChange = (markdown: string) => {
    contentRef.current = markdown;
    if (isBlog) {
      blogForm.setValue('content', markdown);
    } else if (isPage) {
      pageForm.setValue('content', markdown);
    }
  };

  // Save blog post
  const handleSaveBlog = async (data: BlogPostFormData) => {
    try {
      if (isNew) {
        await createBlogMutation.mutateAsync(data);
        toast({
          title: 'Created',
          description: 'Blog post has been created.',
        });
      } else if (id) {
        await updateBlogMutation.mutateAsync({ id, input: data });
        toast({
          title: 'Updated',
          description: 'Blog post has been updated.',
        });
      }
      navigate('/blog-posts');
    } catch {
      toast({
        title: 'Error',
        description: `Failed to ${isNew ? 'create' : 'update'} blog post.`,
        variant: 'destructive',
      });
    }
  };

  // Save page
  const handleSavePage = async (data: PageFormData) => {
    if (!id) return;

    // Merge metadata fields with existing metadata
    const existingMeta = (page?.metadata || {}) as Record<string, unknown>;
    const metadata = {
      ...existingMeta,
      subtitle: data.subtitle || undefined,
      description: data.description || undefined,
      ctaTitle: data.ctaTitle || undefined,
      ctaDescription: data.ctaDescription || undefined,
      ctaText: data.ctaText || undefined,
      ctaHref: data.ctaHref || undefined,
    };

    try {
      await updatePageMutation.mutateAsync({
        pageKey: id,
        input: {
          title: data.title,
          content: data.content,
          metadata,
        },
      });
      toast({
        title: 'Saved',
        description: 'Page content has been updated.',
      });
      navigate('/pages');
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to save page content.',
        variant: 'destructive',
      });
    }
  };

  const isLoading = (isBlog && !isNew && isLoadingBlog) || (isPage && isLoadingPage);
  const isSubmitting =
    createBlogMutation.isPending ||
    updateBlogMutation.isPending ||
    updatePageMutation.isPending;

  const backPath = isBlog ? '/blog-posts' : '/pages';
  const pageTitle = isBlog
    ? isNew
      ? 'New Blog Post'
      : 'Edit Blog Post'
    : `Edit ${id} Page`;

  // Get initial content for the editor
  const getInitialContent = () => {
    if (isBlog && blogPost) return blogPost.content;
    if (isPage && page) return page.content;
    return '';
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-screen bg-background">
        <div className="flex items-center gap-4 px-4 py-3 border-b">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-6 w-48" />
        </div>
        <div className="flex-1 p-4">
          <Skeleton className="h-full w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(backPath)}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div className="h-6 w-px bg-border" />
          <h1 className="text-lg font-semibold">{pageTitle}</h1>
        </div>

        <div className="flex items-center gap-2">
          {isBlog && blogForm.watch('slug') && (
            <Button variant="ghost" size="sm" asChild>
              <a
                href={`https://www.flatironscapital.com/news/${blogForm.watch('slug')}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Preview
              </a>
            </Button>
          )}
        </div>
      </header>

      {/* Main content area */}
      <div
        className="flex-1 overflow-auto"
        style={{ marginRight: sidebarOpen ? '400px' : '0' }}
      >
        <BlockNoteEditor
          initialMarkdown={getInitialContent()}
          onChange={handleContentChange}
        />
      </div>

      {/* Sidebar */}
      <ContentSidebar
        title={isBlog ? 'Post Details' : 'Page Details'}
        isOpen={sidebarOpen}
        onOpenChange={setSidebarOpen}
        footer={
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => navigate(backPath)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (isBlog) {
                  blogForm.handleSubmit(handleSaveBlog)();
                } else if (isPage) {
                  pageForm.handleSubmit(handleSavePage)();
                }
              }}
              disabled={isSubmitting}
              className="flex-1"
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save
            </Button>
          </div>
        }
      >
        {/* Blog post fields */}
        {isBlog && (
          <>
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                placeholder="Enter post title"
                {...blogForm.register('title')}
              />
              {blogForm.formState.errors.title && (
                <p className="text-sm text-destructive">
                  {blogForm.formState.errors.title.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">Slug</Label>
              <Input
                id="slug"
                placeholder="post-slug"
                {...blogForm.register('slug')}
              />
              <p className="text-xs text-muted-foreground">
                Auto-generated from title. Used in the URL.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="excerpt">Excerpt</Label>
              <Textarea
                id="excerpt"
                placeholder="Brief summary of the post..."
                rows={3}
                {...blogForm.register('excerpt')}
              />
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={blogForm.watch('category')}
                onValueChange={(v) => blogForm.setValue('category', v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category} className="capitalize">
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Author</Label>
              <Select
                value={blogForm.watch('author')}
                onValueChange={(v) => blogForm.setValue('author', v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select author" />
                </SelectTrigger>
                <SelectContent>
                  {authors.map((author) => (
                    <SelectItem key={author} value={author}>
                      {author}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <Label htmlFor="isPublished" className="text-base">
                  Published
                </Label>
                <p className="text-sm text-muted-foreground">
                  Make this post visible
                </p>
              </div>
              <Switch
                id="isPublished"
                checked={blogForm.watch('isPublished')}
                onCheckedChange={(checked) => blogForm.setValue('isPublished', checked)}
              />
            </div>

            {blogForm.formState.errors.content && (
              <p className="text-sm text-destructive">
                {blogForm.formState.errors.content.message}
              </p>
            )}
          </>
        )}

        {/* Page fields */}
        {isPage && (
          <>
            <div className="space-y-2">
              <Label htmlFor="pageTitle">Page Title *</Label>
              <Input
                id="pageTitle"
                placeholder="Enter page title"
                {...pageForm.register('title')}
              />
              {pageForm.formState.errors.title && (
                <p className="text-sm text-destructive">
                  {pageForm.formState.errors.title.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-muted-foreground">Page Key</Label>
              <p className="text-sm font-mono bg-muted px-3 py-2 rounded-md">
                {id}
              </p>
              <p className="text-xs text-muted-foreground">
                The page key cannot be changed.
              </p>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="pageSubtitle">Subtitle</Label>
              <Input
                id="pageSubtitle"
                placeholder="Page subtitle (shown in hero)"
                {...pageForm.register('subtitle')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pageDescription">Description</Label>
              <Textarea
                id="pageDescription"
                placeholder="Page description (shown in hero)"
                rows={3}
                {...pageForm.register('description')}
              />
            </div>

            <Separator />

            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              CTA Section
            </p>

            <div className="space-y-2">
              <Label htmlFor="pageCtaTitle">CTA Title</Label>
              <Input
                id="pageCtaTitle"
                placeholder="Call-to-action heading"
                {...pageForm.register('ctaTitle')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pageCtaDescription">CTA Description</Label>
              <Textarea
                id="pageCtaDescription"
                placeholder="Call-to-action description"
                rows={2}
                {...pageForm.register('ctaDescription')}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label htmlFor="pageCtaText">CTA Button Text</Label>
                <Input
                  id="pageCtaText"
                  placeholder="Button text"
                  {...pageForm.register('ctaText')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pageCtaHref">CTA Button Link</Label>
                <Input
                  id="pageCtaHref"
                  placeholder="/contact"
                  {...pageForm.register('ctaHref')}
                />
              </div>
            </div>

            {pageForm.formState.errors.content && (
              <p className="text-sm text-destructive">
                {pageForm.formState.errors.content.message}
              </p>
            )}
          </>
        )}
      </ContentSidebar>
    </div>
  );
}
