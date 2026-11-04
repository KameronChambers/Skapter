# Skapter

**An autonomous agent that runs a small service business's customer DMs: it quotes real prices, checks supplies, holds the time slot, reads customer photos, and tells the owner when a human is needed.**

Built for the **Meta Global AI Developer Hackathon x Cerebral Valley** | Track: **Indie Developer** | Problem statement: **Build for Your World**

Built by the owner of **SudBudd MD**, a mobile car detailing business in Detroit, to fix his own inbox.

---

## The problem

- Customers of independent service businesses book through DMs. The inbox is disconnected from supplies, prices and the calendar.
- The owner copy-pastes prices, double-checks stock by hand, and replies late. (One customer in the demo data waited 22 hours.)
- Plain chatbots guess prices and over-promise. Two customers can claim the last of something at the same time.

## What it does

1. A customer messages the business (text, photo, English or Spanish).
2. The agent (**Muse Spark Open**) reads it and calls tools: quote a price, check supplies, check the service area, hold a slot.
3. A **Postgres function with row locking** holds the supplies and time slot for 15 minutes, so the same supplies can't be sold twice.
4. The agent replies, and every step lands in the **Execution Log** with the real model name and timing.
5. Code-level guards block wrong prices and unauthorized discounts, and a request for a human flags the chat for the owner.
6. The owner sees everything live in a cockpit (Inbox, Agent, Inventory, calendar and job map), and can ask the agent questions about the business.

---

## Status at a glance

| Capability | Status |
| :-- | :-- |
| Autonomous agent loop on Muse Spark Open (served on Baseten), with tool calling | Working, demoed |
| Supply holds: atomic, 15-minute expiry, deducted per service recipe and vehicle size (S/M/L) | Working, demoed |
| Service-area check (ZIP to distance) and time-slot conflict check | Working |
| Photo to service recommendation (Muse Spark Open vision) | Working via the Customer Simulator |
| Multilingual replies | Working (Spanish tested) |
| Guards: unlisted prices, price attached to the wrong service, discount offers, human-request rule, one self-correction retry | Working |
| Owner chat on live data (inventory, bookings, conversations), saved 30 days | Working |
| Live cockpit (realtime Inbox, Agent, Inventory, calendar, job map) | Working |
| WhatsApp Cloud API (webhook + replies) | **Code written, NOT verified end to end.** The demo uses the Customer Simulator, which feeds the same pipeline. |
| Instagram / Messenger | **Not built.** The inbox shows channel badges on sample conversations only. |
| Stripe checkout / payments | **Not built.** The agent holds supplies and the slot; the owner confirms payment. |
| Meta Model API (Muse Spark 1.3) fallback | **Not built or used** |
| Muse Voice Transcribe, SAM 3.1, Muse Image | **Not used.** (The mic button uses the browser's built-in speech recognition, not a Meta model.) |
| Revenue chart, weekly performance report | **Sample data** |
| Login / multi-tenant | **Not built.** Demo database policies are open. |

---

## How Meta models are used

| Model | Where | What for |
| :-- | :-- | :-- |
| **Muse Spark Open** (`meta-models/muse-spark-open-1026`), open weights, served on Baseten | `supabase/functions/agent`, `supabase/functions/owner-chat` | Tool calling and reasoning for customer replies, vision for photos, multilingual replies, and the owner's business chat |

Every model-driven row in the Execution Log carries `muse-spark-open`. Rows written by plain code (guards, owner button actions, sample data) carry `system`, never a model name.

**Why open weights:** a small merchant can choose where inference runs and isn't locked into per-message pricing from a closed API.

---

## Architecture

```text
Customer message (Customer Simulator today; WhatsApp code included, unverified)
        |
        v
Supabase table: messages  --->  Edge Function "agent"
                                 |  1. claims the new message (atomic)
                                 |  2. calls Muse Spark Open on Baseten (text + photo)
                                 |  3. runs tools against Postgres:
                                 |       get_quote, reserve_booking, escalate_to_owner, classify_conversation
                                 |  4. guards the reply (prices, discounts), one rewrite attempt if blocked
                                 |  5. writes the reply + honest log rows
                                 v
Postgres (Supabase)  <-- reserve_booking(): row-locked supply holds, 15-minute expiry
        |
        v  realtime
Cockpit (React): Inbox | Agent (rules, log, owner chat) | Inventory | Calendar + map
```

Key files:

- `supabase/schema.sql`: tables, the atomic `reserve_booking` / `confirm_reservation` functions, sample-data reset
- `supabase/functions/agent/index.ts`: the autonomous agent
- `supabase/functions/owner-chat/index.ts`: the owner's business assistant
- `supabase/functions/whatsapp/index.ts`: WhatsApp webhook with signature verification (unverified end to end)
- `src/lib/data.ts`: the app's single data layer (reads, writes, realtime)

---

## Engineering notes

- **No overselling.** `reserve_booking` locks inventory rows, subtracts active holds from on-hand stock, and returns the exact shortage if anything is short. Holds expire after 15 minutes.
- **Real recipes.** Each service deducts specific amounts of each supply, scaled by vehicle size, from SudBudd MD's actual menu.
- **The model is not the pricing authority.** Prices come from the database. A guard rejects any dollar amount that isn't on the list, and any price written next to the wrong service. A rejected reply gets one rewrite attempt before a safe holding message is used.
- **Honest failure.** If the model is unavailable or returns nothing, the owner is flagged, a holding message is sent, and the log says why. No fabricated results.
- **Credit protection.** The public function endpoints are rate-limited per hour.

---

## Hackathon compliance

- **Built during the hackathon.** All code in this repository was written during the hackathon (see the commit history). Prices and supply recipes come from SudBudd MD's real menu; customers, messages, addresses and stock counts are synthetic.
- **How it was built.** UI scaffolded with Lovable; backend, database and agent code written with AI coding assistance (Claude); open-source libraries (React, Vite, TanStack, Tailwind, shadcn/ui, Leaflet, Recharts, Supabase client).
- **Third-party services.** Baseten (inference for Muse Spark Open), Supabase (database, realtime, edge functions, storage), Zippopotam (free ZIP lookup).
- **Open source.** MIT licensed.

---

## Run it yourself

1. Create a free **Supabase** project.
2. In the SQL Editor, run `supabase/schema.sql` on the empty project.
3. Create two Edge Functions, `agent` and `owner-chat`, from the files under `supabase/functions/`. Turn **off** "Verify JWT" for each.
4. Add the secret `BASETEN_API_KEY` (Edge Functions, Secrets). Use model string `meta-models/muse-spark-open-1026`.
5. Create a `.env` in the project root with your project's **public** values:
   ```env
   VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=your_public_publishable_key
   ```
6. `npm install` then `npm run dev`, and open the URL printed in the terminal.
7. In **Inbox, Customer Simulator**, send: *"Hi! I'd like to book a Premium Interior for my Honda CR-V this Thursday at 10 AM. I'm in Detroit, ZIP 48224."*

Optional (unverified): add `supabase/functions/whatsapp` plus `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_APP_SECRET`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`.

**Never put secret keys in this repository.** Only the public publishable key belongs in `.env`.

---

## Known limitations

- Pending bookings aren't cancelled automatically when their 15-minute hold expires (the supplies are released, the booking row stays).
- Payment isn't collected; the owner confirms.
- The demo database allows open access and the photo bucket is public. Use synthetic data and your own test photos only.
- The tests in `src/test` were written for an earlier in-memory prototype and are out of date.
- Agent answers on hard questions can take 5 to 10 seconds.

## Roadmap

Connect WhatsApp and Instagram live, add Stripe checkout and payment confirmation, auto-cancel expired holds, Meta Model API fallback, voice notes with Muse Voice Transcribe, more business types beyond detailing.

## License

MIT, see [LICENSE](LICENSE).ICENSE).
