// Delivery slot labels and expected time windows (IST, 24h)

export interface SlotWindow {
  label: string;
  startHour: number;
  endHour: number;
}

export const DELIVERY_SLOTS: Record<string, SlotWindow> = {
  'morning-early': { label: 'Early Morning', startHour: 5, endHour: 8 },
  early_morning: { label: 'Early Morning', startHour: 5, endHour: 8 },
  morning: { label: 'Morning', startHour: 8, endHour: 11 },
  'morning-late': { label: 'Late Morning', startHour: 8, endHour: 11 },
  afternoon: { label: 'Afternoon', startHour: 12, endHour: 16 },
  'evening-early': { label: 'Early Evening', startHour: 16, endHour: 19 },
  early_evening: { label: 'Early Evening', startHour: 16, endHour: 19 },
  evening: { label: 'Evening', startHour: 19, endHour: 22 },
  night: { label: 'Night', startHour: 19, endHour: 22 },
};

export const getSlotWindow = (slot: string | null | undefined): SlotWindow | null => {
  if (!slot) return null;
  return DELIVERY_SLOTS[String(slot).toLowerCase().trim()] || null;
};

export const formatSlotLabel = (slot: string | null | undefined): string => {
  if (!slot) return 'Not set';
  const window = getSlotWindow(slot);
  if (window) return window.label;
  return String(slot).replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
};

export const formatSlotRange = (slot: string | null | undefined): string | null => {
  const window = getSlotWindow(slot);
  if (!window) return null;
  const fmt = (h: number) => {
    const period = h >= 12 ? 'PM' : 'AM';
    const hr = h % 12 === 0 ? 12 : h % 12;
    return `${hr}:00 ${period}`;
  };
  return `${fmt(window.startHour)} - ${fmt(window.endHour)}`;
};
