

## Fix: Change Revenue Period Default from "All Time" to "Today"

### Root Cause

In `src/pages/Index.tsx` (line 18), the `selectedPeriod` state is initialized to `'all'` (All Time). The user wants it to default to `'today'`.

### Fix

Change the default value in `useState` from `'all'` to `'today'`:

```typescript
const [selectedPeriod, setSelectedPeriod] = useState('today');
```

### Files Changed
- `src/pages/Index.tsx` — change default `selectedPeriod` from `'all'` to `'today'`

