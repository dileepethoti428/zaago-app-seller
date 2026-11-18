import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pencil, Trash2, Search, ImagePlus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { CategoryThumb } from '@/components/NewCategoryExtras';
import { uploadCategoryImage } from '@/utils/categoryImage';

interface Row { id: string; name: string; image_url: string | null; is_active: boolean | null; count: number; photo: string | null; }

export function CategoriesManagerDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [allInfo, setAllInfo] = useState<{ count: number; photo: string | null }>({ count: 0, photo: null });
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState('');
  const [target, setTarget] = useState<Row | null>(null);
  const [editingAll, setEditingAll] = useState(false);
  const [savingAll, setSavingAll] = useState(false);
  const allFileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    if (!user?.id) return;
    setLoading(true);
    const [{ data: cats }, { data: prods }, { data: seller }] = await Promise.all([
      supabase.from('categories').select('id, name, image_url, is_active').eq('seller_id', user.id).order('name'),
      supabase.from('products').select('category_id, category, image_url').eq('seller_id', user.id),
      supabase.from('sellers').select('all_category_image_url').eq('user_id', user.id).maybeSingle(),
    ]);
    const all = prods || [];
    setAllInfo({
      count: all.length,
      photo: (seller as any)?.all_category_image_url || all.find((p: any) => p.image_url)?.image_url || null,
    });
    setRows((cats || []).map((c: any) => {
      const mine = (prods || []).filter((p: any) => p.category_id === c.id || p.category === c.name);
      const withImg = mine.find((p: any) => p.image_url);
      return { ...c, count: mine.length, photo: c.image_url || withImg?.image_url || null };
    }));
    setLoading(false);
  };

  useEffect(() => { if (open) load(); }, [open, user?.id]);

  const filtered = useMemo(() => rows.filter((r) => r.name.toLowerCase().includes(q.toLowerCase())), [rows, q]);

  const doDelete = async () => {
    if (!target || target.count > 0) return;
    const { error } = await supabase.from('categories').delete().eq('id', target.id);
    if (error) toast.error(error.message);
    else { toast.success(`Deleted ${target.name}`); setRows((r) => r.filter((x) => x.id !== target.id)); }
    setTarget(null);
  };

  const saveAllPhoto = async (file: File | null) => {
    if (!user?.id) return;
    setSavingAll(true);
    try {
      const url = file ? await uploadCategoryImage(file) : null;
      const { error } = await supabase.from('sellers').update({ all_category_image_url: url } as any).eq('user_id', user.id);
      if (error) throw error;
      toast.success(url ? 'All photo updated' : 'All photo reset to a product photo');
      setEditingAll(false);
      await load();
    } catch (e: any) {
      toast.error(e?.message || 'Could not save the photo');
    } finally {
      setSavingAll(false);
      if (allFileRef.current) allFileRef.current.value = '';
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Edit Categories</DialogTitle>
            <DialogDescription>All your categories with their photos and product counts.</DialogDescription>
          </DialogHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search categories" className="pl-9" />
          </div>
          <div className="flex-1 overflow-y-auto space-y-1 -mx-1 px-1">
            {!loading && 'all'.includes(q.toLowerCase()) && (
              <div className="flex items-center gap-3 rounded-lg px-2 py-2 border border-border bg-muted/40">
                <CategoryThumb url={allInfo.photo} />
                <div className="flex-1 min-w-0">
                  <p className="truncate text-foreground font-medium">All</p>
                  <p className="text-xs text-muted-foreground">
                    {allInfo.count} product{allInfo.count === 1 ? '' : 's'} • Shows everything
                  </p>
                </div>
                <button type="button" aria-label="Edit All photo" onClick={() => setEditingAll(true)}
                  className="p-2 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10">
                  <Pencil className="w-4 h-4" />
                </button>
              </div>
            )}
            {loading ? (
              <p className="text-sm text-muted-foreground py-6 text-center">Loading...</p>
            ) : filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No categories found</p>
            ) : filtered.map((r) => (
              <div key={r.id} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-accent">
                <CategoryThumb url={r.photo} />
                <div className="flex-1 min-w-0">
                  <p className="truncate text-foreground font-medium">{r.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.count} product{r.count === 1 ? '' : 's'}{r.is_active === false ? ' • Inactive' : ''}{!r.image_url && r.photo ? ' • Product photo' : ''}
                  </p>
                </div>
                <button type="button" aria-label={`Edit ${r.name}`} onClick={() => { onOpenChange(false); navigate(`/categories/${r.id}/edit?from=products`); }}
                  className="p-2 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10">
                  <Pencil className="w-4 h-4" />
                </button>
                <button type="button" aria-label={`Delete ${r.name}`} onClick={() => setTarget(r)}
                  className="p-2 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={editingAll} onOpenChange={setEditingAll}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit "All" photo</DialogTitle>
            <DialogDescription>This photo shows on the All button in the customer app.</DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-3">
            <CategoryThumb url={allInfo.photo} />
            <div className="flex-1 space-y-2">
              <label className="flex items-center justify-center gap-2 px-3 py-2 border border-border rounded-lg cursor-pointer text-sm text-foreground hover:bg-accent">
                <ImagePlus className="h-4 w-4" /> {savingAll ? 'Saving...' : 'Choose photo'}
                <input ref={allFileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden"
                  disabled={savingAll} onChange={(e) => saveAllPhoto(e.target.files?.[0] || null)} />
              </label>
              <button type="button" disabled={savingAll} onClick={() => saveAllPhoto(null)}
                className="w-full px-3 py-2 text-sm rounded-lg text-muted-foreground hover:bg-accent disabled:opacity-50">
                Reset to a product photo
              </button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Square, 512×512, white or see-through background, under 1 MB</p>
        </DialogContent>
      </Dialog>
      <AlertDialog open={!!target} onOpenChange={(o) => !o && setTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{target && target.count > 0 ? 'Cannot delete category' : 'Delete category?'}</AlertDialogTitle>
            <AlertDialogDescription>
              {target && target.count > 0
                ? `"${target.name}" has ${target.count} product(s). Move or delete them first.`
                : `"${target?.name}" will be removed permanently.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{target && target.count > 0 ? 'OK' : 'Cancel'}</AlertDialogCancel>
            {target && target.count === 0 && (
              <AlertDialogAction onClick={doDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
