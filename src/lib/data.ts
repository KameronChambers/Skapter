/**
 * Skapter data-access layer.
 * ALL app reads/writes go through this file. Currently backed by an in-memory
 * store seeded with synthetic data; swap this file for a database version later.
 */

export type Channel = "WhatsApp" | "Instagram" | "Simulated";
export type Category = "Spam" | "Inquiry" | "Customer";
export type Sender = "customer" | "agent" | "owner";

export interface Conversation {
  id: string;
  name: string;
  channel: Channel;
  category: Category;
  unread: boolean;
  unreadAgent: boolean;
  flagged: boolean;
  flagNote?: string;
  lastAt: number;
  address?: string;
  preferredContact: string;
  purchases: { service: string; price: number; date: string }[];
}
export interface Message {
  id: string;
  conversationId: string;
  sender: Sender;
  text: string;
  at: number;
}
export interface InventoryItem {
  id: string;
  name: string;
  price: number;
  stock: number;
  capacity: number;
}
export interface Booking {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
}
export interface LogEntry {
  id: string;
  at: number;
  action: string;
  status: "ok" | "error";
  detail: string;
  provider: string;
  reason?: string;
}
export interface Rule {
  id: string;
  text: string;
  enabled: boolean;
}
export interface Task {
  id: string;
  text: string;
  done: boolean;
}
export interface UrgentAction {
  id: string;
  text: string;
  level: "red" | "amber";
}
export interface Settings {
  businessName: string;
  modelStatus: "live" | "fallback";
}
export interface Performance {
  score: number;
  report: string;
  mostPurchased: string;
  leastPurchased: string;
}

export type Table =
  | "conversations"
  | "messages"
  | "inventory"
  | "bookings"
  | "log"
  | "rules"
  | "tasks"
  | "settings";

const HOUR = 3600_000;
const uid = () => Math.random().toString(36).slice(2, 10);

function iso(d: Date) {
  return d.toISOString().slice(0, 10);
}

function seed() {
  const now = Date.now();
  const conv = (
    id: string,
    name: string,
    channel: Channel,
    category: Category,
    hoursAgo: number,
    extra: Partial<Conversation> = {},
  ): Conversation => ({
    id,
    name,
    channel,
    category,
    unread: false,
    unreadAgent: false,
    flagged: false,
    lastAt: now - hoursAgo * HOUR,
    preferredContact: channel,
    purchases: [],
    ...extra,
  });
  const conversations: Conversation[] = [
    conv("c1", "Mark Vance", "WhatsApp", "Customer", 22, {
      unread: true,
      flagged: true,
      flagNote: "Asked for a human",
      address: "1420 Woodward Ave, Detroit 48226",
      purchases: [{ service: "Full Detail", price: 189, date: "2026-08-14" }],
    }),
    conv("c2", "Lucía Morales", "WhatsApp", "Inquiry", 1.2, { unread: true, unreadAgent: true }),
    conv("c3", "Detroit Deals Promo", "Instagram", "Spam", 3),
    conv("c4", "Roy Henderson", "Instagram", "Customer", 5, {
      address: "88 Lakeshore Dr, Detroit 48236",
      purchases: [
        { service: "Interior Detail", price: 129, date: "2026-06-02" },
        { service: "Ceramic Coat", price: 349, date: "2026-09-20" },
      ],
    }),
    conv("c5", "Tasha Greene", "WhatsApp", "Inquiry", 8, { unreadAgent: true }),
    conv("c6", "Devon Price", "Instagram", "Customer", 26, {
      purchases: [{ service: "Exterior Wash", price: 59, date: "2026-10-01" }],
    }),
    conv("c7", "Amir Haddad", "Simulated", "Inquiry", 30),
    conv("c8", "Kelly O'Brien", "WhatsApp", "Customer", 48, {
      address: "300 Grand River, Detroit 48201",
      purchases: [{ service: "Full Detail", price: 189, date: "2026-07-11" }],
    }),
  ];
  const m = (cid: string, sender: Sender, text: string, hoursAgo: number): Message => ({
    id: uid(),
    conversationId: cid,
    sender,
    text,
    at: now - hoursAgo * HOUR,
  });
  const messages: Message[] = [
    m("c1", "customer", "Hey, my last detail left streaks on the windshield.", 22.3),
    m("c1", "agent", "Sorry about that, Mark! I can schedule a free touch-up.", 22.2),
    m("c1", "customer", "I'd rather talk to a human please.", 22),
    m("c2", "customer", "Hola, ¿pueden hacer un detallado completo el jueves en el 48236?", 1.3),
    m("c2", "agent", "¡Hola Lucía! Sí, tenemos disponible el jueves a las 10am. ¿Lo reservo?", 1.2),
    m("c3", "customer", "🔥 GET 10K FOLLOWERS TODAY 🔥 click link in bio", 3),
    m("c4", "customer", "Confirming my detail for Thursday?", 5.2),
    m("c4", "agent", "Confirmed: Full Detail Thu 10am at 48236.", 5.1),
    m("c4", "owner", "Thanks Roy, see you then!", 5),
    m("c5", "customer", "How much for a ceramic coating on an SUV?", 8.1),
    m("c5", "agent", "Ceramic coating for SUVs starts at $399. Want a quote?", 8),
    m("c6", "customer", "Great job on the wash last week!", 26),
    m("c7", "customer", "Do you service Dearborn?", 30),
    m("c8", "customer", "Can I book another full detail next month?", 48),
    m("c8", "agent", "Absolutely, I'll send available dates.", 47.9),
  ];
  const today = new Date();
  const d = (offset: number) => {
    const x = new Date(today);
    x.setDate(x.getDate() + offset);
    return iso(x);
  };
  const bookings: Booking[] = [
    { id: uid(), title: "Roy Henderson · Full Detail", date: d(0), time: "10:00" },
    { id: uid(), title: "Lucía Morales · Full Detail", date: d(2), time: "10:00" },
    { id: uid(), title: "Kelly O'Brien · Interior", date: d(5), time: "13:30" },
    { id: uid(), title: "Supply run", date: d(0), time: "16:00" },
    { id: uid(), title: "Devon Price · Exterior Wash", date: d(-3), time: "09:00" },
  ];
  const inventory: InventoryItem[] = [
    { id: "i1", name: "Clay bar", price: 14.99, stock: 2, capacity: 20 },
    { id: "i2", name: "Microfiber towels", price: 24.5, stock: 44, capacity: 50 },
    { id: "i3", name: "Ceramic spray", price: 39.0, stock: 13, capacity: 20 },
    { id: "i4", name: "Carpet shampoo", price: 18.75, stock: 11, capacity: 20 },
    { id: "i5", name: "Wheel cleaner", price: 16.25, stock: 7, capacity: 20 },
    { id: "i6", name: "Interior detailer", price: 12.99, stock: 17, capacity: 20 },
  ];
  const l = (
    minsAgo: number,
    action: string,
    status: "ok" | "error",
    detail: string,
    provider: string,
    reason?: string,
  ): LogEntry => ({ id: uid(), at: now - minsAgo * 60_000, action, status, detail, provider, reason });
  const log: LogEntry[] = [
    l(3, "reserve_stock", "ok", "1x Full Detail Thu 10am", "gemini-flash"),
    l(4, "reply_customer", "ok", "Lucía Morales (ES)", "gemini-flash"),
    l(18, "classify_message", "ok", "Detroit Deals Promo → Spam", "gemini-flash"),
    l(42, "create_booking", "error", "Mark Vance touch-up", "fallback", "Customer requested a human; escalated"),
    l(65, "send_quote", "ok", "Tasha Greene · Ceramic SUV $399", "gemini-flash"),
    l(120, "update_inventory", "error", "Clay bar restock", "fallback", "Supplier API timeout"),
  ];
  const rules: Rule[] = [
    { id: "r1", text: "If a customer asks for a human, alert me, flag the chat, and tell them I will respond shortly.", enabled: true },
    { id: "r2", text: "Never give out discount codes; only the owner may.", enabled: true },
  ];
  const tasks: Task[] = [
    { id: "t1", text: "Review AI agent responses from yesterday", done: true },
    { id: "t2", text: "Go shopping for new supplies today @ 4:00pm", done: false },
    { id: "t3", text: "Complete detail for Roy Henderson, Detroit 48236", done: false },
  ];
  const settings: Settings = { businessName: "SudBudd MD", modelStatus: "live" };
  return { conversations, messages, bookings, inventory, log, rules, tasks, settings };
}

let store = seed();
const listeners = new Map<Table, Set<() => void>>();
function emit(...tables: Table[]) {
  tables.forEach((t) => listeners.get(t)?.forEach((cb) => cb()));
}

export function subscribe(table: Table, callback: () => void): () => void {
  if (!listeners.has(table)) listeners.set(table, new Set());
  listeners.get(table)!.add(callback);
  return () => listeners.get(table)!.delete(callback);
}

const clone = <T>(v: T): T => structuredClone(v);

// ---------- Settings ----------
export async function getSettings(): Promise<Settings> {
  return clone(store.settings);
}
export async function setModelStatus(status: Settings["modelStatus"]) {
  store.settings.modelStatus = status;
  emit("settings");
}

// ---------- Home ----------
export async function getPerformance(): Promise<Performance> {
  return {
    score: 8,
    report:
      "Response time improved 18% week over week. The agent closed 6 bookings autonomously and escalated 1 conversation. Ceramic upsells are trending up; clay bar usage outpaced restocks.",
    mostPurchased: "Full Detail",
    leastPurchased: "Headlight Restoration",
  };
}
export function performanceLabel(score: number): string {
  if (score <= 2) return "Subpar";
  if (score <= 5) return "Serviceable";
  if (score <= 7) return "Adequate";
  return "Exemplary";
}
export async function getUrgentActions(): Promise<UrgentAction[]> {
  return [
    { id: "u1", text: "Respond to Mark Vance, waiting 22 hrs", level: "red" },
    { id: "u2", text: "Clay bar stock critically low", level: "red" },
    { id: "u3", text: "Agent reminder: update seasonal discount code", level: "amber" },
  ];
}
export async function getTasks(): Promise<Task[]> {
  return clone(store.tasks);
}
export async function toggleTask(id: string) {
  const t = store.tasks.find((x) => x.id === id);
  if (t) t.done = !t.done;
  emit("tasks");
}
export async function getBookings(): Promise<Booking[]> {
  return clone(store.bookings);
}
export async function addBooking(b: Omit<Booking, "id">) {
  store.bookings.push({ ...b, id: uid() });
  emit("bookings");
}

// ---------- Inbox ----------
export async function getConversations(): Promise<(Conversation & { preview: string })[]> {
  return store.conversations.map((c) => {
    const last = [...store.messages].filter((m) => m.conversationId === c.id).sort((a, b) => b.at - a.at)[0];
    return { ...clone(c), preview: last?.text ?? "" };
  });
}
export async function getMessages(conversationId: string): Promise<Message[]> {
  return clone(store.messages.filter((m) => m.conversationId === conversationId).sort((a, b) => a.at - b.at));
}
export async function markRead(conversationId: string) {
  const c = store.conversations.find((x) => x.id === conversationId);
  if (c && (c.unread || c.unreadAgent)) {
    c.unread = false;
    c.unreadAgent = false;
    emit("conversations");
  }
}
export async function sendOwnerMessage(conversationId: string, text: string) {
  const at = Date.now();
  store.messages.push({ id: uid(), conversationId, sender: "owner", text, at });
  const c = store.conversations.find((x) => x.id === conversationId);
  if (c) c.lastAt = at;
  emit("messages", "conversations");
}
export async function flagConversation(conversationId: string, note: string) {
  const c = store.conversations.find((x) => x.id === conversationId);
  if (c) {
    c.flagged = true;
    c.flagNote = note;
  }
  emit("conversations");
}
export async function unflagConversation(conversationId: string) {
  const c = store.conversations.find((x) => x.id === conversationId);
  if (c) {
    c.flagged = false;
    c.flagNote = undefined;
  }
  emit("conversations");
}
/** Sends a message as a simulated customer. Returns the conversation id. */
export async function sendSimulatedCustomerMessage(text: string): Promise<string> {
  let c = store.conversations.find((x) => x.id === "sim");
  const at = Date.now();
  if (!c) {
    c = {
      id: "sim",
      name: "Simulated Customer",
      channel: "Simulated",
      category: "Inquiry",
      unread: true,
      unreadAgent: false,
      flagged: false,
      lastAt: at,
      preferredContact: "Simulated",
      purchases: [],
    };
    store.conversations.push(c);
  }
  c.unread = true;
  c.lastAt = at;
  store.messages.push({ id: uid(), conversationId: c.id, sender: "customer", text, at });
  emit("messages", "conversations");
  return c.id;
}

// ---------- Agent ----------
/** Placeholder: wire to a real model later. No AI calls are made today. */
export async function askAgent(text: string): Promise<string> {
  return `[placeholder] The agent isn't connected yet. You asked: "${text}"`;
}
export async function getRules(): Promise<Rule[]> {
  return clone(store.rules);
}
export async function saveRule(text: string) {
  store.rules.unshift({ id: uid(), text, enabled: true });
  emit("rules");
}
export async function toggleRule(id: string) {
  const r = store.rules.find((x) => x.id === id);
  if (r) r.enabled = !r.enabled;
  emit("rules");
}
export async function getExecutionLog(): Promise<LogEntry[]> {
  return clone([...store.log].sort((a, b) => b.at - a.at));
}
export async function getErrors(): Promise<LogEntry[]> {
  return (await getExecutionLog()).filter((l) => l.status === "error");
}

// ---------- Inventory ----------
export type StockStatus = "Great" | "Good" | "Fine" | "Low" | "Critical";
export function stockPercent(i: InventoryItem): number {
  return Math.round((i.stock / i.capacity) * 100);
}
export function stockStatus(pct: number): StockStatus {
  if (pct >= 80) return "Great";
  if (pct >= 60) return "Good";
  if (pct >= 50) return "Fine";
  if (pct >= 30) return "Low";
  return "Critical";
}
export async function getInventory(): Promise<InventoryItem[]> {
  return clone(store.inventory);
}

// ---------- Demo ----------
export async function resetDemo() {
  store = seed();
  emit("conversations", "messages", "inventory", "bookings", "log", "rules", "tasks", "settings");
}
