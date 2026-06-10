Replace 'Vacation Comp.' in the sidebar navigation with 'Manage Categories' pointing to /categories, and remove the unused /vacation-compensations route from App.tsx.

Changes:
1. `src/components/Sidebar.tsx`
   - Replace `{ href: '/vacation-compensations', label: 'Vacation Comp.', icon: CalendarOff }` with `{ href: '/categories', label: 'Manage Categories', icon: Tag }` in the `navigationLinks` array.
   - Add `Tag` to the `lucide-react` import list.

2. `src/App.tsx`
   - Remove the line `<Route path="vacation-compensations" element={<VacationCompensations />} />`.
   - Optionally remove the unused `VacationCompensations` import if desired.