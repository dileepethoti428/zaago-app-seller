## Add Help & Support section on Profile page

### Goal
Add a single "Help & Support" card on the Profile page combining the three contact methods into one section (matching the reference image).

### Card contents
- **Header:** Help icon (green) + title "Help & Support" + subtitle "Get help and contact us"
- **Row 1 — WhatsApp Support:** green WhatsApp icon, label "WhatsApp Support", value "+91-7842343642" → opens `https://wa.me/917842343642`
- **Row 2 — Email Support:** mail icon, label "Email Support", value "zaago.online@gmail.com" → opens `mailto:zaago.online@gmail.com`
- **Row 3 — Call Support:** phone icon, label "Call Support", value "+91-7842343642" → opens `tel:+917842343642`
- Each row is a clickable button with a chevron-right on the right; WhatsApp row uses a subtle green-tinted background, the other two use muted card background.

### Implementation
- **File:** `src/pages/Profile.tsx` only.
- Use existing `Card`/`CardHeader`/`CardContent` and lucide icons (`HelpCircle`, `MessageCircle`, `Mail`, `Phone`, `ChevronRight`).
- Place the card near the bottom of the Profile content (above any sign-out / delete section if present).
- Use semantic Tailwind tokens (`bg-card`, `text-muted-foreground`, `text-zaago-green`, `border-border`) — no hard-coded colors.
- No backend/DB changes. No new dependencies.
