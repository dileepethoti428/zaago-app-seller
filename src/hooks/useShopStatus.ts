import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

export interface ShopSettings {
  is_shop_open: boolean;
  opening_time: string;
  closing_time: string;
  auto_schedule_enabled: boolean;
}

const DEFAULTS: ShopSettings = {
  is_shop_open: true,
  opening_time: '06:00:00',
  closing_time: '22:00:00',
  auto_schedule_enabled: true,
};

export const toSeconds = (t: string) => {
  const [h = '0', m = '0', s = '0'] = (t || '00:00').split(':');
  return +h * 3600 + +m * 60 + +s;
};

export const nowIstSeconds = (d = new Date()) => {
  const t = d.toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata', hour12: false });
  return toSeconds(t);
};

export const isWithinHours = (open: string, close: string, now: number) => {
  const o = toSeconds(open), c = toSeconds(close);
  if (o === c) return true;
  return o < c ? now >= o && now < c : now >= o || now < c; // overnight
};

export const formatTime12 = (t: string) => {
  const [h, m] = (t || '00:00').split(':').map(Number);
  const ap = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ap}`;
};

export const useShopStatus = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<ShopSettings>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [now, setNow] = useState(nowIstSeconds());

  useEffect(() => {
    const i = setInterval(() => setNow(nowIstSeconds()), 60000);
    return () => clearInterval(i);
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const { data } = await (supabase as any)
        .from('sellers')
        .select('is_shop_open, opening_time, closing_time, auto_schedule_enabled')
        .eq('user_id', user.id)
        .maybeSingle();
      if (data) setSettings({ ...DEFAULTS, ...Object.fromEntries(Object.entries(data).filter(([, v]) => v !== null)) } as ShopSettings);
      setLoading(false);
    })();
  }, [user?.id]);

  const update = useCallback(async (patch: Partial<ShopSettings>) => {
    if (!user?.id) return false;
    setSaving(true);
    const { error } = await (supabase as any).from('sellers').update(patch).eq('user_id', user.id);
    setSaving(false);
    if (error) return false;
    setSettings((s) => ({ ...s, ...patch }));
    return true;
  }, [user?.id]);

  const toggleShop = async () => {
    const next = !settings.is_shop_open;
    const ok = await update({ is_shop_open: next });
    if (!ok) return toast.error('Failed to update shop status');
    toast.success(next ? 'Shop is now Open (Live on Zaago)' : 'Shop is now Closed (Hidden on Zaago)');
  };

  const saveTimings = async (openingTime: string, closingTime: string, autoSchedule: boolean) => {
    const norm = (t: string) => (t.length === 5 ? `${t}:00` : t);
    const ok = await update({ opening_time: norm(openingTime), closing_time: norm(closingTime), auto_schedule_enabled: autoSchedule });
    ok ? toast.success('Operating hours updated successfully') : toast.error('Failed to save timings');
  };

  const withinHours = isWithinHours(settings.opening_time, settings.closing_time, now);
  const effectivelyOpen = settings.is_shop_open && (!settings.auto_schedule_enabled || withinHours);

  return { settings, loading, saving, toggleShop, saveTimings, withinHours, effectivelyOpen };
};
