=== README.md ===
# Skapter 

> **Autonomous merchant operations and deterministic transaction engine for conversational social commerce.**  
> Built for the **Meta Global AI Developer Hackathon × Cerebral Valley** | **Track:** Indie Developer | **Theme:** *Build for Your World*

<p align="left">
  <img src="https://img.shields.io/badge/License-MIT-zinc.svg?style=flat-square" alt="License: MIT" />
  <img src="https://img.shields.io/badge/Meta_Model-Muse_Spark_Open_1026-blue.svg?style=flat-square" alt="Meta Model: Muse Spark Open" />
  <img src="https://img.shields.io/badge/Platform-WhatsApp_Cloud_API-25D366.svg?style=flat-square" alt="Meta Platform: WhatsApp Cloud API" />
  <img src="https://img.shields.io/badge/Stack-React_|_Vite_|_Tailwind_|_Supabase-000000.svg?style=flat-square" alt="Stack" />
  <img src="https://img.shields.io/badge/Status-Built_at_Hackathon-emerald.svg?style=flat-square" alt="Status" />
</p>

---

## ⚡ Executive Summary

**Skapter OS** is an autonomous operational control center engineered for independent service providers and social brands converting customer demand inside direct messaging channels (WhatsApp, Instagram DMs). 

Rather than deploying an unconstrained conversational chatbot that can hallucinate quotes or drop orders, Skapter pairs **Meta’s open-weight Muse Spark Open** model with schema-validated tool calling to execute deterministic backend operations:
1. **Parses Buyer Intent & Specs:** Automatically extracts vehicle class, service packages, and physical retail upsells from unstructured natural language text or audio messages.
2. **Executes Atomic Inventory Locks:** Decrements physical stock and reserves calendar time-slots with an expiring 15-minute Time-To-Live (TTL) hold in PostgreSQL to prevent double-booking and stockouts.
3. **Issues Dynamic Checkout Links:** Stages instant, bundled Stripe checkout sessions combining labor deposits and retail goods.
4. **Maintains Merchant Oversight:** Feeds live state into an institutional merchant operations console equipped with a Supervisor circuit breaker, live execution traces, and automated supply replenishment decks.

---

## 📌 Problem & Humanity Focus: The Context Void

Independent operators (e.g., mobile detailers, barbers, field technicians) process a significant portion of their sales pipeline through direct social messages. However, native social messaging platforms are operational dead zones:
* **The Manual Friction:** Business owners waste hours weekly copy-pasting addresses, typing out payment links, and cross-checking stock across fragmented spreadsheets.
* **The Unreliable Bot Trap:** Standard rule-based bots fail on conversational ambiguity, while unconstrained generative chatbots hallucinate invalid pricing or offer unapproved discounts.
* **The Race-Condition Bottleneck:** When two customers inquire about the last available appointment or physical retail product simultaneously, manual human latency leads to double-booking, cart abandonment, and customer churn.

---

## 🏗️ Architecture & Data Flow

Skapter enforces an architectural separation between non-deterministic language understanding and deterministic business rules:

```text
[ Inbound Customer WhatsApp / DM ]
                 │
                 ▼
[ Meta Webhook Ingestion Engine ]
                 │
                 ▼
[ Provider Layer (Failover Architecture) ]
├── Primary Endpoint: Muse Spark Open (Hosted via Baseten)
└── Secondary Fallback: Muse Spark 1.3 (Meta Model API)
                 │
                 ▼
[ Deterministic Tool-Call Parser ]
├── parse_intent(service, zip, date, language)
├── lookup_customer(handle, phone)
├── check_calendar(open_slots, location)
├── reserve_stock(sku, qty, ttl=15m)
└── create_checkout(stripe_session)
                 │
                 ▼
[ PostgreSQL / Supabase Ledger ] ◄─── Atomic Row-Level Locks (TTL)
                 │
                 ▼
[ Skapter Merchant Cockpit ]
├── Live Unified Inbox & Customer CRM Passport
├── Real-Time Chemical & Physical Inventory Ledger
└── Supervisor Mode (Human-in-the-Loop Circuit Breaker)
```

---

## 🤖 Deep Meta Product Integration

| Meta Product / Tool | Architectural Role | Implementation Scope |
| :--- | :--- | :--- |
| **Muse Spark Open** (`meta-models/muse-spark-open-1026`) | **Primary Agent Brain** | Open-weight model served via Baseten inference. Drives structured function calling, entity parsing, policy compliance, and cross-lingual translation. |
| **Meta Model API** (`Muse Spark 1.3`) | **High-Availability Fallback** | Secondary provider layer fallback configured with an 8–10s timeout to maintain system uptime if the primary inference node encounters rate limits. |
| **WhatsApp Cloud API** | **Live Ingestion Funnel** | Handles live inbound and outbound messaging using Meta’s test business account and webhook infrastructure. |
| **Muse Voice Transcribe** | **Multimodal Voice-to-Action** | Transcribes hands-free technician audio logs and customer voice notes directly into structured JSON tool arguments. |
| **SAM 3.1 & Spark Vision** *(Roadmap)* | **Visual Damage Assessment** | Segments customer vehicle photos (e.g., paint scratch severity) to recommend tailored service tiers before staging a quote. |

### Why Open-Weight Models Matter for Independent Commerce
Closed commercial LLMs impose high per-message API fees and require routing private customer data (residential addresses, contact details, gate codes) through third-party servers. Using **Meta's open-weight Muse Spark Open** allows merchants to run cost-effective, audited, and privacy-compliant inference pipelines on infrastructure they control with zero data retention.

---

## 🛡️ Autonomous Operational Philosophy

1. **Event-Driven:** Inbound customer inquiries trigger autonomous tool-execution pipelines with zero merchant intervention.
2. **Proactive Scheduling:** Automated background jobs monitor abandoned carts, alert the owner to neglected threads (e.g., customer waiting > 22 hours), and populate morning restock tasks.
3. **Strictly Rule-Bound:** Plain-text merchant policy presets are injected into the agent prompt and reinforced by deterministic output validators (e.g., unauthorized discounts or non-existent SKUs are blocked programmatically).
4. **Transparently Auditable:** Every tool execution, latency metric, and error boundary catch is recorded in the **Execution Log**.
5. **Supervisor Mode Circuit Breaker:** High-ticket quotes can be toggled to require 1-click human verification before outbound dispatch.

---

## 🛠️ Deterministic Agent Toolset

| Tool Name | Purpose | Execution Logic |
| :--- | :--- | :--- |
| `parse_intent` | Ingestion & Extraction | Extracts service class, location/ZIP, scheduling constraints, urgency, and language. |
| `lookup_customer` | CRM Reconciliation | Fetches or creates customer records, vehicle specifications, and historical spend. |
| `check_calendar` | Capacity Planning | Queries open booking slots within the localized Detroit service boundary ($\le 20\text{ miles}$). |
| `reserve_stock` | Atomic Inventory Lock | Executes a row-level lock in PostgreSQL with an expiring 15-minute TTL hold. |
| `create_checkout` | Payment Generation | Constructs a dynamic Stripe checkout link bundling labor deposits and physical SKUs. |
| `book_slot` | Calendar Commit | Confirms appointment scheduling upon verified payment webhook receipt. |
| `escalate_to_owner` | Human Escalation | Flags the conversation and dispatches a merchant alert when human review is requested. |
| `draft_reply` | Contextual Composition | Composes an outbound message constrained by merchant tone and business guidelines. |

---

## 💻 Tech Stack & Dependencies

* **Frontend Dashboard:** React 18, Vite, TypeScript, Tailwind CSS, Lexend Typography, Lucide Icons
* **Agent Engine:** Meta Muse Spark Open (`muse-spark-open-1026`), Meta Model API (`Muse Spark 1.3`)
* **Database & Atomic Locks:** Supabase / PostgreSQL (Row-level locking with expiring timestamps)
* **Payment Pipeline:** Stripe API (Test-mode dynamic session creation)
* **Communication APIs:** Meta WhatsApp Cloud API (Webhooks)

---

## 🚀 Quickstart & Local Installation

### Prerequisites
* Node.js 18+ and npm
* Git
* Baseten API Key or Meta Model API Key
* Supabase Account & Stripe Test Key

### 1. Clone the Repository
```bash
git clone [https://github.com/your-username/skapter.git](https://github.com/your-username/skapter.git)
cd skapter
```

### 2. Configure Environment Variables
Create a `.env` file in the project root:
```env
# Inference Providers
BASETEN_API_KEY=your_baseten_key
META_MODEL_API_KEY=your_meta_model_api_key
PRIMARY_MODEL_STRING=meta-models/muse-spark-open-1026

# Meta WhatsApp Cloud API
WHATSAPP_TOKEN=your_system_user_token
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WEBHOOK_VERIFY_TOKEN=your_custom_verify_token

# Persistence & Billing
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
STRIPE_SECRET_KEY=your_stripe_test_secret_key
```

### 3. Install Dependencies & Launch
```bash
npm install
npm run dev
```
Open `http://localhost:5173` in your browser to view the console.

---

## 💬 Architectural & Technical FAQ

#### Q1: How does Skapter prevent inventory overselling during concurrent DM rushes?
**A:** When `reserve_stock` is executed, the backend creates an atomic row lock in PostgreSQL. The physical SKU or service slot count decrements immediately with a 15-minute Time-To-Live (TTL). If checkout is completed via Stripe within 15 minutes, the reservation commits. If the session expires, a background cron function automatically releases the lock and returns the unit to inventory.

#### Q2: What prevents the agent from hallucinating prices or unauthorized discounts?
**A:** The language model acts solely as an entity extractor, not a pricing authority. Pricing is determined deterministically by joining extracted SKUs with an immutable database pricing table. Outbound replies containing unauthorized discounts are caught and blocked by an output filter that validates against merchant policy rules.

#### Q3: Why is a dual-provider architecture used?
**A:** Real-world merchant tools cannot go down during client conversations. If the primary Baseten endpoint encounters rate-limiting or latency exceeding 8 seconds, the provider layer automatically routes the tool call through the secondary Meta Model API endpoint, surfacing an honest `[Live / Fallback]` badge on the dashboard.

---

## 🏆 Hackathon Compliance & Authenticity

* **Built Exclusively During the Hackathon:** All application code, agent logic, tool definitions, database schemas, and console components were built from scratch between **October 27 and November 4, 2026**.
* **Domain Authenticity:** Modeled after the active operational workflow of **SudBudd MD**, a mobile auto detailing service in Detroit, MI. All client data, addresses, and telephone numbers displayed in demonstrations are strictly synthetic.
* **Open Source:** Licensed under the [MIT License](LICENSE).
