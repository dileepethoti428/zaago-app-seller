// Helpers for "Book Now, Get Later" (scheduled) orders.
// A scheduled order has a delivery_time_slot set (e.g. "18:00-20:00")
// or a delivery_date that's later than the order's created_at date (IST).

const IST_TZ = 'Asia/Kolkata';

interface OrderLike {
  created_at?: string | null;
  delivery_date?: string | null;
  delivery_time?: string | null; // "HH:MM:SS"
  delivery_time_slot?: string | null; // "HH:MM-HH:MM"
}

function toISTDateString(iso: string): string {
  // yyyy-mm-dd in IST
  const d = new Date(iso);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: IST_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
  return parts; // en-CA gives yyyy-mm-dd
}

export function isScheduledOrder(order: OrderLike | null | undefined): boolean {
  if (!order) return false;
  if (order.delivery_time_slot && order.delivery_time_slot.trim() !== '') return true;
  if (order.delivery_date && order.created_at) {
    try {
      const createdIST = toISTDateString(order.created_at);
      return order.delivery_date > createdIST;
    } catch {
      return false;
    }
  }
  return false;
}

function parseSlotStart(slot?: string | null): { h: number; m: number } | null {
  if (!slot) return null;
  const m = slot.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return null;
  return { h: parseInt(m[1], 10), m: parseInt(m[2], 10) };
}

function parseTime(t?: string | null): { h: number; m: number } | null {
  if (!t) return null;
  const m = t.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return null;
  return { h: parseInt(m[1], 10), m: parseInt(m[2], 10) };
}

function fmt12h(h: number, m: number): string {
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hh = ((h + 11) % 12) + 1;
  const mm = m.toString().padStart(2, '0');
  return `${hh}:${mm} ${suffix}`;
}

export function formatDeliveryWindow(order: OrderLike): string {
  const parts: string[] = [];
  if (order.delivery_date) {
    const d = new Date(`${order.delivery_date}T00:00:00`);
    parts.push(
      d.toLocaleDateString('en-IN', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      })
    );
  }
  if (order.delivery_time_slot) {
    const m = order.delivery_time_slot.match(/^(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})/);
    if (m) {
      const start = fmt12h(parseInt(m[1], 10), parseInt(m[2], 10));
      const end = fmt12h(parseInt(m[3], 10), parseInt(m[4], 10));
      parts.push(`${start} – ${end}`);
    } else {
      parts.push(order.delivery_time_slot);
    }
  } else if (order.delivery_time) {
    const t = parseTime(order.delivery_time);
    if (t) parts.push(fmt12h(t.h, t.m));
  }
  return parts.join(' · ');
}

// Pack-by time = slot start (or delivery_time) − 1 hour, formatted 12h.
export function getPackByLabel(order: OrderLike): string | null {
  const slot = parseSlotStart(order.delivery_time_slot);
  const timeOnly = parseTime(order.delivery_time);
  const base = slot || timeOnly;
  if (!base) return null;
  let h = base.h;
  let m = base.m - 0;
  h -= 1;
  if (h < 0) h += 24;
  return fmt12h(h, m);
}
