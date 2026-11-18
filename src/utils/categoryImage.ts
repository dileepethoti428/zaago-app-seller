import { supabase } from '@/integrations/supabase/client';

const SIZE = 512;
const MAX_BYTES = 1024 * 1024;

const loadImage = (file: File) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });

/** Center-crops to a square, resizes to 512x512 and keeps it under 1 MB. */
export async function prepareCategoryImage(file: File): Promise<Blob> {
  const img = await loadImage(file);
  const side = Math.min(img.width, img.height);
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, SIZE, SIZE);
  const toBlob = (type: string, q?: number) =>
    new Promise<Blob>((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('Image failed'))), type, q));
  if (file.type === 'image/png') {
    const png = await toBlob('image/png');
    if (png.size <= MAX_BYTES) return png;
  }
  // JPEG needs a white background
  const flat = document.createElement('canvas');
  flat.width = SIZE; flat.height = SIZE;
  const fctx = flat.getContext('2d')!;
  fctx.fillStyle = '#ffffff';
  fctx.fillRect(0, 0, SIZE, SIZE);
  fctx.drawImage(canvas, 0, 0);
  for (const q of [0.9, 0.8, 0.7, 0.6, 0.5]) {
    const b = await new Promise<Blob>((res, rej) => flat.toBlob((x) => (x ? res(x) : rej(new Error('Image failed'))), 'image/jpeg', q));
    if (b.size <= MAX_BYTES) return b;
  }
  throw new Error('Photo is too large, please choose a smaller one');
}

export async function uploadCategoryImage(file: File): Promise<string> {
  const blob = await prepareCategoryImage(file);
  const ext = blob.type === 'image/png' ? 'png' : 'jpg';
  const path = `category-images/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from('product-images').upload(path, blob, { contentType: blob.type });
  if (error) throw error;
  return supabase.storage.from('product-images').getPublicUrl(path).data.publicUrl;
}

const norm = (s: string) => s.toLowerCase().replace(/[_\-]+/g, ' ').replace(/\s+/g, ' ').trim();

/** Finds an existing category whose name looks like the typed one. */
export function findSimilarCategory<T extends { name: string }>(typed: string, list: T[]): T | null {
  const t = norm(typed);
  if (t.length < 3) return null;
  const words = t.split(' ').filter((w) => w.length >= 3);
  return (
    list.find((c) => {
      const n = norm(c.name);
      if (n === t || n.includes(t) || t.includes(n)) return true;
      return n.split(' ').some((w) => w.length >= 3 && words.includes(w));
    }) || null
  );
}
