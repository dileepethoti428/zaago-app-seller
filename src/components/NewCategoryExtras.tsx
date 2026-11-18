import { useEffect, useState } from 'react';
import { ImagePlus, X } from 'lucide-react';
import { findSimilarCategory } from '@/utils/categoryImage';

interface Props {
  name: string;
  categories: { id: string; name: string }[];
  photo: File | null;
  onPhotoChange: (f: File | null) => void;
  onUseExisting: (id: string) => void;
}

export function NewCategoryExtras({ name, categories, photo, onPhotoChange, onUseExisting }: Props) {
  const [preview, setPreview] = useState<string | null>(null);
  useEffect(() => {
    if (!photo) { setPreview(null); return; }
    const url = URL.createObjectURL(photo);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);
  const similar = findSimilarCategory(name, categories);

  return (
    <div className="mt-2 space-y-2">
      {similar && (
        <div className="flex items-center justify-between gap-2 rounded-lg border border-border bg-muted px-3 py-2 text-sm">
          <span className="text-foreground">Similar category exists: <b>{similar.name}</b></span>
          <button type="button" onClick={() => onUseExisting(similar.id)} className="shrink-0 text-primary font-medium">
            Use it
          </button>
        </div>
      )}
      <div className="flex items-center gap-3">
        {preview ? (
          <div className="relative">
            <img src={preview} alt="Category" className="h-14 w-14 rounded-lg object-cover border border-border" />
            <button type="button" onClick={() => onPhotoChange(null)} aria-label="Remove photo"
              className="absolute -top-2 -right-2 rounded-full bg-destructive text-destructive-foreground p-0.5">
              <X className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <label className="flex items-center gap-2 px-3 py-2 border border-border rounded-lg cursor-pointer text-sm text-foreground hover:bg-accent">
            <ImagePlus className="h-4 w-4" /> Category photo
            <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden"
              onChange={(e) => onPhotoChange(e.target.files?.[0] || null)} />
          </label>
        )}
        <p className="text-xs text-muted-foreground">Square, 512×512, white or see-through background, under 1 MB</p>
      </div>
    </div>
  );
}

export function CategoryThumb({ url }: { url?: string | null }) {
  return url ? (
    <img src={url} alt="" className="h-7 w-7 rounded-full object-cover border border-border shrink-0" />
  ) : (
    <span className="h-7 w-7 rounded-full bg-muted shrink-0" />
  );
}
