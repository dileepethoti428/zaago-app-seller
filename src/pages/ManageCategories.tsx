import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, GripVertical, ArrowLeft, ChevronDown, Package } from 'lucide-react';
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
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string; productCount: number } | null>(null);
  const [openIds, setOpenIds] = useState<Record<string, boolean>>({});

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

  // Counts per category (single query, fast)
  const { data: counts } = useQuery({
    queryKey: ['seller-category-counts', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, category_id, category')
        .eq('seller_id', user?.id);
      if (error) throw error;
      return data as { id: string; category_id: string | null; category: string | null }[];
    },
    enabled: !!user?.id,
  });

  const countFor = (cat: any) => {
    if (!counts) return 0;
    return counts.filter(
      (p) => p.category_id === cat.id || (p.category && p.category === cat.name)
    ).length;
  };

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
          {categories?.map((category) => {
            const isOpen = !!openIds[category.id];
            const productCount = countFor(category);
            return (
              <Card key={category.id} className="overflow-hidden">
                <Collapsible
                  open={isOpen}
                  onOpenChange={(o) => setOpenIds((s) => ({ ...s, [category.id]: o }))}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-4 min-w-0">
                        <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab shrink-0" />

                        <div
                          className="px-4 py-2 rounded-lg shadow-sm shrink-0"
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

                        <Badge variant="secondary" className="shrink-0">
                          <Package className="h-3 w-3 mr-1" />
                          {productCount} product{productCount === 1 ? '' : 's'}
                        </Badge>

                        {!category.is_active && (
                          <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                            Inactive
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
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
                          title="Edit category"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>

                        <Button
                          variant="outline"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeleteId(category.id)}
                          title="Delete category"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>

                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="icon" title="Show products">
                            <ChevronDown
                              className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                            />
                          </Button>
                        </CollapsibleTrigger>
                      </div>
                    </div>

                    <CollapsibleContent>
                      <div className="mt-4 border-t pt-4">
                        <CategoryProducts
                          categoryId={category.id}
                          categoryName={category.name}
                          sellerId={user?.id}
                          enabled={isOpen}
                          onEdit={(pid) => navigate(`/products/${pid}/edit`)}
                          onAdd={() => navigate('/add-product')}
                        />
                      </div>
                    </CollapsibleContent>
                  </CardContent>
                </Collapsible>
              </Card>
            );
          })}
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

interface CategoryProductsProps {
  categoryId: string;
  categoryName: string;
  sellerId?: string;
  enabled: boolean;
  onEdit: (productId: string) => void;
  onAdd: () => void;
}

const CategoryProducts: React.FC<CategoryProductsProps> = ({
  categoryId,
  categoryName,
  sellerId,
  enabled,
  onEdit,
  onAdd,
}) => {
  const { data: products, isLoading } = useQuery({
    queryKey: ['category-products', categoryId, sellerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, price, image_url, stock_quantity, is_active, category_id, category')
        .eq('seller_id', sellerId)
        .or(`category_id.eq.${categoryId},category.eq.${categoryName}`)
        .order('name', { ascending: true });
      if (error) throw error;
      return data as any[];
    },
    enabled: enabled && !!sellerId,
  });

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
      </div>
    );
  }

  if (!products || products.length === 0) {
    return (
      <div className="flex items-center justify-between gap-3 p-4 bg-muted/40 rounded-lg">
        <p className="text-sm text-muted-foreground">No products in this category yet.</p>
        <Button size="sm" variant="outline" onClick={onAdd}>
          <Plus className="h-4 w-4 mr-1" />
          Add product
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-2">
      {products.map((p) => (
        <div
          key={p.id}
          className="flex items-center gap-3 p-2 rounded-lg border hover:bg-muted/40 transition-colors"
        >
          <div className="w-12 h-12 rounded-md overflow-hidden bg-muted shrink-0">
            {p.image_url ? (
              <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                <Package className="h-5 w-5" />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{p.name}</p>
            <p className="text-xs text-muted-foreground">
              ₹{p.price} · Stock: {p.stock_quantity ?? 0}
              {!p.is_active && ' · Inactive'}
            </p>
          </div>

          <Button size="sm" variant="outline" onClick={() => onEdit(p.id)}>
            <Edit className="h-3.5 w-3.5 mr-1" />
            Edit
          </Button>
        </div>
      ))}
    </div>
  );
};

export default ManageCategories;
