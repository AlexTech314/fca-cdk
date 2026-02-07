import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, ArrowLeft } from 'lucide-react';

import {
  useTombstone,
  useCreateTombstone,
  useUpdateTombstone,
} from '@/hooks/useTombstones';
import { useToast } from '@/hooks/use-toast';
import { slugify } from '@/lib/utils';
import { PageContainer } from '@/components/layout/PageContainer';
import { Header } from '@/components/layout/Header';
import { ImageUploader } from '@/components/tombstones/ImageUploader';
import { PreviewIframe } from '@/components/preview/PreviewIframe';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

const tombstoneSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  slug: z.string().optional(),
  imagePath: z.string().min(1, 'Image is required'),
  industry: z.string().optional(),
  role: z.string().optional(),
  dealDate: z.string().optional(),
  description: z.string().optional(),
  sortOrder: z.number().optional(),
  isPublished: z.boolean().default(false),
});

type TombstoneFormData = z.infer<typeof tombstoneSchema>;

const industries = [
  'Manufacturing',
  'Healthcare',
  'Technology',
  'Professional Services',
  'Construction',
  'Distribution',
  'Financial Services',
  'Consumer Products',
  'Industrial Services',
];

const roles = ['Sell-Side', 'Buy-Side'];

export default function TombstoneForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = !!id;

  const { data: tombstone, isLoading: isLoadingTombstone } = useTombstone(id);
  const createMutation = useCreateTombstone();
  const updateMutation = useUpdateTombstone();
  const { toast } = useToast();

  const form = useForm<TombstoneFormData>({
    resolver: zodResolver(tombstoneSchema),
    defaultValues: {
      name: '',
      slug: '',
      imagePath: '',
      industry: '',
      role: '',
      dealDate: '',
      description: '',
      sortOrder: 0,
      isPublished: false,
    },
  });

  // Load existing tombstone data
  useEffect(() => {
    if (tombstone) {
      form.reset({
        name: tombstone.name,
        slug: tombstone.slug,
        imagePath: tombstone.imagePath,
        industry: tombstone.industry || '',
        role: tombstone.role || '',
        dealDate: tombstone.dealDate || '',
        description: tombstone.description || '',
        sortOrder: tombstone.sortOrder,
        isPublished: tombstone.isPublished,
      });
    }
  }, [tombstone, form]);

  // Auto-generate slug from name
  const watchName = form.watch('name');
  useEffect(() => {
    if (!isEditing && watchName) {
      const slug = slugify(watchName);
      form.setValue('slug', slug);
    }
  }, [watchName, isEditing, form]);

  const onSubmit = async (data: TombstoneFormData) => {
    try {
      if (isEditing && id) {
        await updateMutation.mutateAsync({ id, input: data });
        toast({
          title: 'Updated',
          description: 'Transaction has been updated.',
        });
      } else {
        await createMutation.mutateAsync(data);
        toast({
          title: 'Created',
          description: 'Transaction has been created.',
        });
      }
      navigate('/transactions');
    } catch (error) {
      toast({
        title: 'Error',
        description: `Failed to ${isEditing ? 'update' : 'create'} transaction.`,
        variant: 'destructive',
      });
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  if (isEditing && isLoadingTombstone) {
    return (
      <>
        <Header
          breadcrumbs={[
            { label: 'Transactions', href: '/transactions' },
            { label: 'Loading...' },
          ]}
        />
        <PageContainer>
          <div className="grid gap-6 lg:grid-cols-2">
            <Skeleton className="h-[600px]" />
            <Skeleton className="h-[600px]" />
          </div>
        </PageContainer>
      </>
    );
  }

  return (
    <>
      <Header
        breadcrumbs={[
          { label: 'Transactions', href: '/transactions' },
          { label: isEditing ? 'Edit' : 'New' },
        ]}
      />
      <PageContainer>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Form */}
            <Card>
              <CardHeader>
                <CardTitle>{isEditing ? 'Edit Transaction' : 'New Transaction'}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Name */}
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    placeholder="Company Name"
                    {...form.register('name')}
                  />
                  {form.formState.errors.name && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.name.message}
                    </p>
                  )}
                </div>

                {/* Slug */}
                <div className="space-y-2">
                  <Label htmlFor="slug">Slug</Label>
                  <Input
                    id="slug"
                    placeholder="company-name"
                    {...form.register('slug')}
                  />
                  <p className="text-xs text-muted-foreground">
                    Auto-generated from name. Used in the URL.
                  </p>
                </div>

                {/* Image */}
                <div className="space-y-2">
                  <Label>Image *</Label>
                  <ImageUploader
                    value={form.watch('imagePath')}
                    onChange={(path) => form.setValue('imagePath', path)}
                  />
                  {form.formState.errors.imagePath && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.imagePath.message}
                    </p>
                  )}
                </div>

                {/* Industry & Role */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Industry</Label>
                    <Select
                      value={form.watch('industry')}
                      onValueChange={(v) => form.setValue('industry', v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select industry" />
                      </SelectTrigger>
                      <SelectContent>
                        {industries.map((industry) => (
                          <SelectItem key={industry} value={industry}>
                            {industry}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Role</Label>
                    <Select
                      value={form.watch('role')}
                      onValueChange={(v) => form.setValue('role', v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        {roles.map((role) => (
                          <SelectItem key={role} value={role}>
                            {role}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Deal Date */}
                <div className="space-y-2">
                  <Label htmlFor="dealDate">Deal Date</Label>
                  <Input
                    id="dealDate"
                    type="date"
                    {...form.register('dealDate')}
                  />
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Brief description of the transaction..."
                    rows={4}
                    {...form.register('description')}
                  />
                </div>

                {/* Published */}
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <Label htmlFor="isPublished" className="text-base">
                      Published
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Make this tombstone visible on the website
                    </p>
                  </div>
                  <Switch
                    id="isPublished"
                    checked={form.watch('isPublished')}
                    onCheckedChange={(checked) => form.setValue('isPublished', checked)}
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-4 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate('/transactions')}
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isEditing ? 'Update' : 'Create'} Transaction
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Preview */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Preview</h3>
              <PreviewIframe
                contentType="tombstone"
                slug={form.watch('slug') || 'preview'}
                previewToken={tombstone?.previewToken || 'preview-token'}
              />
            </div>
          </div>
        </form>
      </PageContainer>
    </>
  );
}
