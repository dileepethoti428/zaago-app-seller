import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, GripVertical, ArrowLeft } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const ManageCategories = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: categories, isLoading } = useQuery({
    queryKey: ['seller-categories', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('seller_id', user?.id)
        .order('display_order', { ascending: true });
      
      if (error) throw error;
      return data as any[];
    },
    enabled: !!user?.id,
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('categories')
        .update({ is_active })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-categories'] });
      toast({ title: 'Category updated' });
    },
    onError: () => {
      toast({ title: 'Error updating category', variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-categories'] });
      toast({ title: 'Category deleted' });
      setDeleteId(null);
    },
    onError: () => {
      toast({ title: 'Error deleting category', variant: 'destructive' });
    },
  });

  const getFontWeight = (weight?: string) => {
    switch (weight) {
      case 'bold': return 700;
      case 'medium': return 500;
      default: return 400;
    }
  };

  const getBackground = (category: any) => {
    if (category.is_gradient && category.gradient_start_color && category.gradient_end_color) {
      return `linear-gradient(135deg, ${category.gradient_start_color}, ${category.gradient_end_color})`;
    }
    return category.background_color || '#FFFFFF';
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Manage Categories</h1>
            <p className="text-muted-foreground">Create and customize your product categories</p>
          </div>
        </div>
        <Button onClick={() => navigate('/add-category')}>
          <Plus className="h-4 w-4 mr-2" />
          Add Category
        </Button>
      </div>

      {categories && categories.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground mb-4">No categories yet</p>
          <Button onClick={() => navigate('/add-category')}>
            <Plus className="h-4 w-4 mr-2" />
            Create Your First Category
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4">
          {categories?.map((category) => (
            <Card key={category.id} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab" />
                    
                    {/* Styled Preview */}
                    <div
                      className="px-4 py-2 rounded-lg shadow-sm"
                      style={{
                        fontFamily: category.font_family || 'Inter',
                        fontSize: `${category.font_size || 14}px`,
                        fontWeight: getFontWeight(category.font_weight),
                        color: category.text_color || '#000000',
                        background: getBackground(category),
                      }}
                    >
                      {category.icon && <span className="mr-2">{category.icon}</span>}
                      {category.name}
                    </div>

                    {!category.is_active && (
                      <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                        Inactive
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Active</span>
                      <Switch
                        checked={category.is_active}
                        onCheckedChange={(checked) =>
                          toggleMutation.mutate({ id: category.id, is_active: checked })
                        }
                      />
                    </div>

                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => navigate(`/categories/${category.id}/edit`)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>

                    <Button
                      variant="outline"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeleteId(category.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. Products in this category will need to be reassigned.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ManageCategories;
