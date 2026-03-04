

# Rename "Delivery Agents" to "Delivery Partners" in UI

## Scope
Change all **user-visible text** (labels, titles, descriptions, toasts, badges) from "Delivery Agent(s)" to "Delivery Partner(s)". Internal code (variable names, database columns, query keys, comments) stays unchanged.

## Files to modify

1. **`src/components/Sidebar.tsx`** — Change sidebar label from "Delivery Agents" to "Delivery Partners"

2. **`src/pages/DeliveryAgents.tsx`** — Page title and empty state messages

3. **`src/pages/Orders.tsx`** — "Notify Delivery Agents" button text

4. **`src/pages/CustomerOrders.tsx`** — "Assigned to Delivery Agent" badge text

5. **`src/components/CreateDeliveryAgentModal.tsx`** — Dialog title and description

6. **`src/components/CompensationAssignmentDialog.tsx`** — "Select Delivery Agent" label, empty state text

7. **`src/components/SubscriptionHandoverCard.tsx`** — "Hand over products to delivery agents" description

8. **`src/hooks/useAssignPrimaryAgent.tsx`** — Toast messages ("Delivery agent has been assigned/removed")

9. **`src/hooks/useProductActions.tsx`** — Toast "delivery agent notified" → "delivery partner notified"

10. **`src/hooks/useSubscriptionDeliveryActions.tsx`** — Toast "assigned to delivery agent" → "assigned to delivery partner"

11. **`src/components/DeliveryAgentDetailsDialog.tsx`** — Dialog title if present

12. **`src/components/MarkAgentAbsentDialog.tsx`** — No change needed (says "Agent" not "Delivery Agent")

13. **`src/content/PrivacyPolicyContent.tsx`** — "With Delivery Agents" heading and body text

14. **`src/content/TermsConditionsContent.tsx`** — References to "delivery agents" in terms

All changes are simple string replacements of visible text only. No logic, routing, or database changes needed.

