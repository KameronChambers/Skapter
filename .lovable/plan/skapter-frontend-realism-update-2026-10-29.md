# Skapter frontend realism update

All data changes stay in the central data layer; pages only display it. Look and feel stays the same dark cockpit.

## 1. Map
- Add an "Expand" button on the Detroit jobs card that opens the map in a large full-screen dialog (same pins, legend, service-area circle). Close returns to the small card.

## 2. Home page cards
- Avg response tile becomes "Response speed": Before 12 hrs, After 8s (placeholder value kept in the data layer for later).
- Replace "Revenue held" with "Unread messages" (count from the inbox conversations).
- Revenue card: month chip becomes a dropdown with every month of 2026 plus "All months (by month)". Past/current months show daily revenue; future months show "No data yet"; "All months" shows a monthly total chart. Demo revenue numbers are invented — tell me real ones if you have them.
- Agent performance: add a one-line "Next level" tip under the current info (e.g. "Reply to flagged leads within 1 hr and confirm deposits automatically").

## 3. Inbox
- Filters move into a multi-select dropdown (checkboxes). Selecting several shows conversations matching all chosen tags (e.g. Customer + Inquiry).
- Each conversation can carry multiple tags; everyone who isn't Spam is automatically a Customer.
- Flagging asks for a reason; the reason shows on the conversation and the customer profile card.
- Contact method icons: keep Instagram, add dedicated WhatsApp and Facebook Messenger icons (inline drawings, no outside images).

## 4. Agent rules
- Add a delete (trash) button on each rule, with a quick confirm.

## 5. Inventory rebuild
- Replace supplies with your 14 items, units and pack sizes exactly as listed.
- Replace recipes with your 9 services, each with Small / Medium / Large usage.
- Recipe visualizer: pick service + size, see each supply's deduction and whether stock covers it.
- Booking a job deducts the recipe amounts. If something is short (e.g. clay bar), the agent explains why and adds it to the shopping list. Your Tahoe example (Premium Detail, Large) becomes a test case.
- Layout tidied into one clear supplies grid plus the recipe panel.

## Technical details
- data.ts: new supply/recipe seed tables, `deductRecipe(service, size)`, shopping list, multi-tag conversations (`tags: string[]`, derived Customer), `flagReason`, `deleteRule`, monthly revenue series, response before/after, unread count.
- Tests: Tahoe deduction values, clay shortage adds to shopping list, non-spam = customer, multi-filter AND logic, rule deletion, future month = no data.
