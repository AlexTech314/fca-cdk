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

interface CoreValue {
  id: string;
  title: string;
  description: string;
  iconName?: string;
  displayOrder: number;
  isActive: boolean;
}

export default function CoreValuesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingValue, setEditingValue] = useState<CoreValue | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [iconName, setIconName] = useState('');

  const { data: coreValues, isLoading } = useQuery({
    queryKey: ['core-values'],
    queryFn: () => api.coreValues.getAll(),
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<CoreValue>) => api.coreValues.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['core-values'] });
      toast({ title: 'Core value added successfully' });
      closeDialog();
    },
    onError: () => {
      toast({ title: 'Failed to add core value', variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CoreValue> }) =>
      api.coreValues.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['core-values'] });
      toast({ title: 'Core value updated successfully' });
      closeDialog();
    },
    onError: () => {
      toast({ title: 'Failed to update core value', variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.coreValues.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['core-values'] });
      toast({ title: 'Core value deleted' });
    },
    onError: () => {
      toast({ title: 'Failed to delete core value', variant: 'destructive' });
    },
  });

  const openNewDialog = () => {
    setEditingValue(null);
    setTitle('');
    setDescription('');
    setIconName('');
    setIsDialogOpen(true);
  };

  const openEditDialog = (value: CoreValue) => {
    setEditingValue(value);
    setTitle(value.title);
    setDescription(value.description);
    setIconName(value.iconName || '');
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingValue(null);
  };

  const handleSave = () => {
    const data = {
      title,
      description,
      iconName: iconName || undefined,
    };
    if (editingValue) {
      updateMutation.mutate({ id: editingValue.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this core value?')) {
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
          <h1 className="text-2xl font-bold">Core Values</h1>
          <p className="text-muted-foreground">
            Manage the company values displayed on the website
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <a href="http://localhost:3000/about#values" target="_blank" rel="noopener noreferrer">
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </a>
          </Button>
          <Button onClick={openNewDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Add Value
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Values ({coreValues?.length || 0})</CardTitle>
          <CardDescription>
            Drag to reorder. Values are displayed in order on the about page.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Icon</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {coreValues?.map((value: CoreValue) => (
                <TableRow key={value.id}>
                  <TableCell>
                    <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{value.title}</p>
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {value.description}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    {value.iconName ? (
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                        {value.iconName}
                      </code>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={value.isActive ? 'default' : 'secondary'}>
                      {value.isActive ? 'Active' : 'Hidden'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(value)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(value.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {(!coreValues || coreValues.length === 0) && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No core values yet. Click "Add Value" to get started.
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
              {editingValue ? 'Edit Core Value' : 'Add Core Value'}
            </DialogTitle>
            <DialogDescription>
              {editingValue
                ? 'Update the core value details below.'
                : 'Add a new company core value.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Value Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Integrity"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="We act with honesty and transparency in all our dealings..."
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="iconName">Icon Name (optional)</Label>
              <Input
                id="iconName"
                value={iconName}
                onChange={(e) => setIconName(e.target.value)}
                placeholder="e.g., Shield, Heart, Star"
              />
              <p className="text-xs text-muted-foreground">
                Lucide icon name to display with this value
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
              {editingValue ? 'Save Changes' : 'Add Value'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
