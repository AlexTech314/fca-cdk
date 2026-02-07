import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Trash2, Eye, GripVertical } from 'lucide-react';

import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface IndustrySector {
  id: string;
  name: string;
  slug: string;
  description: string;
  shortDescription?: string;
  iconName?: string;
  displayOrder: number;
  isActive: boolean;
}

export default function IndustriesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingIndustry, setEditingIndustry] = useState<IndustrySector | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [iconName, setIconName] = useState('');

  const { data: industries, isLoading } = useQuery({
    queryKey: ['industries'],
    queryFn: () => api.industries.getAll(),
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<IndustrySector>) => api.industries.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['industries'] });
      toast({ title: 'Industry added successfully' });
      closeDialog();
    },
    onError: () => {
      toast({ title: 'Failed to add industry', variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<IndustrySector> }) =>
      api.industries.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['industries'] });
      toast({ title: 'Industry updated successfully' });
      closeDialog();
    },
    onError: () => {
      toast({ title: 'Failed to update industry', variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.industries.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['industries'] });
      toast({ title: 'Industry deleted' });
    },
    onError: () => {
      toast({ title: 'Failed to delete industry', variant: 'destructive' });
    },
  });

  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const openNewDialog = () => {
    setEditingIndustry(null);
    setName('');
    setSlug('');
    setDescription('');
    setShortDescription('');
    setIconName('');
    setIsDialogOpen(true);
  };

  const openEditDialog = (industry: IndustrySector) => {
    setEditingIndustry(industry);
    setName(industry.name);
    setSlug(industry.slug);
    setDescription(industry.description);
    setShortDescription(industry.shortDescription || '');
    setIconName(industry.iconName || '');
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingIndustry(null);
  };

  const handleSave = () => {
    const data = {
      name,
      slug: slug || generateSlug(name),
      description,
      shortDescription: shortDescription || undefined,
      iconName: iconName || undefined,
    };
    if (editingIndustry) {
      updateMutation.mutate({ id: editingIndustry.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this industry?')) {
      deleteMutation.mutate(id);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Industry Sectors</h1>
          <p className="text-muted-foreground">
            Manage the industries served displayed on the website
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <a href="http://localhost:3000/industries" target="_blank" rel="noopener noreferrer">
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </a>
          </Button>
          <Button onClick={openNewDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Add Industry
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Industries ({industries?.length || 0})</CardTitle>
          <CardDescription>
            Drag to reorder. Industries are displayed in order on the website.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>Industry</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {industries?.map((industry: IndustrySector) => (
                <TableRow key={industry.id}>
                  <TableCell>
                    <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{industry.name}</p>
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {industry.shortDescription || industry.description}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                      {industry.slug}
                    </code>
                  </TableCell>
                  <TableCell>
                    <Badge variant={industry.isActive ? 'default' : 'secondary'}>
                      {industry.isActive ? 'Active' : 'Hidden'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(industry)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(industry.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {(!industries || industries.length === 0) && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No industries yet. Click "Add Industry" to get started.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit/Create Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingIndustry ? 'Edit Industry' : 'Add Industry'}
            </DialogTitle>
            <DialogDescription>
              {editingIndustry
                ? 'Update the industry details below.'
                : 'Add a new industry sector.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Industry Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (!editingIndustry) {
                    setSlug(generateSlug(e.target.value));
                  }
                }}
                placeholder="Healthcare Services"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">URL Slug</Label>
              <Input
                id="slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="healthcare-services"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="shortDescription">Short Description</Label>
              <Input
                id="shortDescription"
                value={shortDescription}
                onChange={(e) => setShortDescription(e.target.value)}
                placeholder="Brief summary for cards and listings"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Full Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detailed description of this industry..."
                rows={6}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="iconName">Icon Name (optional)</Label>
              <Input
                id="iconName"
                value={iconName}
                onChange={(e) => setIconName(e.target.value)}
                placeholder="e.g., Stethoscope, Factory, Truck"
              />
              <p className="text-xs text-muted-foreground">
                Lucide icon name to display with this industry
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {editingIndustry ? 'Save Changes' : 'Add Industry'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
