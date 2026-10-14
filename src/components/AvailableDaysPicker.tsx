import { CalendarDays } from 'lucide-react';

export const WEEK_DAYS = [
  { value: 'monday', label: 'Mon' },
  { value: 'tuesday', label: 'Tue' },
  { value: 'wednesday', label: 'Wed' },
  { value: 'thursday', label: 'Thu' },
  { value: 'friday', label: 'Fri' },
  { value: 'saturday', label: 'Sat' },
  { value: 'sunday', label: 'Sun' },
];

export const formatAvailableDays = (days: string[]) => {
  if (!days || days.length === 0 || days.length === 7) return 'Any day';
  return WEEK_DAYS.filter((d) => days.includes(d.value)).map((d) => d.label).join(', ');
};

interface Props {
  value: string[];
  onChange: (days: string[]) => void;
}

export const AvailableDaysPicker = ({ value, onChange }: Props) => {
  const toggle = (day: string) =>
    onChange(value.includes(day) ? value.filter((d) => d !== day) : WEEK_DAYS.map((d) => d.value).filter((d) => d === day || value.includes(d)));

  return (
    <div className="space-y-2 p-4 bg-card border border-border rounded-lg">
      <div className="flex items-center justify-between gap-2">
        <label className="text-sm font-medium text-foreground flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-primary" /> Available Days
        </label>
        <div className="flex gap-2 text-xs">
          <button type="button" className="text-primary hover:underline" onClick={() => onChange(WEEK_DAYS.map((d) => d.value))}>Every day</button>
          <button type="button" className="text-muted-foreground hover:underline" onClick={() => onChange([])}>Clear</button>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Select the days this product can be delivered (e.g. chicken only on Sunday). Leave empty for any day.
      </p>
      <div className="flex flex-wrap gap-2">
        {WEEK_DAYS.map((d) => {
          const active = value.includes(d.value);
          return (
            <button
              key={d.value}
              type="button"
              aria-pressed={active}
              onClick={() => toggle(d.value)}
              className={`px-4 py-1.5 rounded-full border text-sm transition-colors ${active ? 'bg-primary text-primary-foreground border-primary' : 'bg-background text-foreground border-border hover:bg-muted'}`}
            >
              {d.label}
            </button>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">Delivery days: {formatAvailableDays(value)}</p>
    </div>
  );
};
