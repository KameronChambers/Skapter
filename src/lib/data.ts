/**
 * Skapter data-access layer.
 * ALL app reads/writes go through this file. Currently backed by an in-memory
 * store seeded with synthetic data; swap this file for a database version later.
 */

export type Channel = "WhatsApp" | "Instagram" | "Messenger" | "Simulated";
export type Tag = "Spam" | "Inquiry" | "Customer" | "Returning" | "Booked";
export const TAGS: Tag[] = ["Customer", "Inquiry", "Returning", "Booked", "Spam"];
export type Sender = "customer" | "agent" | "owner";

export interface Conversation {
  id: string;
  name: string;
  channel: Channel;
  tags: Tag[];
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
  unit: string;
  packSize: number;
  packLabel: string;
  price: number; // per pack
  stock: number; // in units
  capacity: number; // in units
}
export type JobService = "Full Detail" | "Interior" | "Exterior Wash" | "Supply run" | "Ceramic Coat" | "Other";
export interface Booking {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  lat: number;
  lng: number;
  service: JobService;
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
  base: { lat: number; lng: number };
  serviceRadiusMiles: number;
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
  const now = Date.parse("2026-10-28T03:55:00Z");
  const conv = (
    id: string,
    name: string,
    channel: Channel,
    tags: Tag[],
    hoursAgo: number,
    extra: Partial<Conversation> = {},
  ): Conversation => ({
    id,
    name,
    channel,
    tags,
    unread: false,
    unreadAgent: false,
    flagged: false,
    lastAt: now - hoursAgo * HOUR,
    preferredContact: channel,
    purchases: [],
    ...extra,
  });
  const conversations: Conversation[] = [
    conv("c1", "Mark Vance", "WhatsApp", ["Returning"], 22, {
      unread: true,
      flagged: true,
      flagNote: "Asked for a human",
      address: "1420 Woodward Ave, Detroit 48226",
      purchases: [{ service: "Full Detail", price: 189, date: "2026-08-14" }],
    }),
    conv("c2", "Lucía Morales", "WhatsApp", ["Inquiry", "Booked"], 1.2, { unread: true, unreadAgent: true }),
    conv("c3", "Detroit Deals Promo", "Instagram", ["Spam"], 3),
    conv("c4", "Roy Henderson", "Instagram", ["Returning", "Booked"], 5, {
      address: "88 Lakeshore Dr, Detroit 48236",
      purchases: [
        { service: "Interior Detail", price: 129, date: "2026-06-02" },
        { service: "Ceramic Coat", price: 349, date: "2026-09-20" },
      ],
    }),
    conv("c5", "Tasha Greene", "Messenger", ["Inquiry"], 8, { unreadAgent: true }),
    conv("c6", "Devon Price", "Messenger", ["Returning"], 26, {
      purchases: [{ service: "Exterior Wash", price: 59, date: "2026-10-01" }],
    }),
    conv("c7", "Amir Haddad", "WhatsApp", ["Inquiry"], 30),
    conv("c8", "Kelly O'Brien", "Instagram", ["Returning", "Inquiry"], 48, {
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
  const today = new Date(now);
  const d = (offset: number) => {
    const x = new Date(today);
    x.setDate(x.getDate() + offset);
    return iso(x);
  };
  const bookings: Booking[] = [
    { id: uid(), title: "Roy Henderson · Full Detail", date: d(0), time: "10:00", lat: 42.411, lng: -82.917, service: "Full Detail" },
    { id: uid(), title: "Lucía Morales · Full Detail", date: d(2), time: "10:00", lat: 42.393, lng: -82.954, service: "Full Detail" },
    { id: uid(), title: "Kelly O'Brien · Interior", date: d(5), time: "13:30", lat: 42.337, lng: -83.054, service: "Interior" },
    { id: uid(), title: "Supply run", date: d(0), time: "16:00", lat: 42.362, lng: -83.086, service: "Supply run" },
    { id: uid(), title: "Devon Price · Exterior Wash", date: d(-3), time: "09:00", lat: 42.351, lng: -83.071, service: "Exterior Wash" },
  ];
  const it = (id: string, name: string, unit: string, packSize: number, packLabel: string, price: number, packs: number, capPacks: number): InventoryItem =>
    ({ id, name, unit, packSize, packLabel, price, stock: Math.round(packs * packSize * 10) / 10, capacity: capPacks * packSize });
  const inventory: InventoryItem[] = [
    it("water", "Water", "gal", 100, "100 gal per unit", 0, 1.6, 2),
    it("soap", "Regular soap", "oz", 32, "32 oz per bottle", 9.99, 3, 4),
    it("psoap", "Premium soap", "oz", 32, "32 oz per bottle", 19.99, 1.5, 4),
    it("gloves", "Gloves", "pcs", 100, "100 per box", 12.99, 1.4, 2),
    it("towels", "Towels", "pcs", 200, "200 per pack", 34.99, 1.8, 2),
    it("glass", "Glass cleaner", "oz", 32, "32 oz per bottle", 7.99, 2, 3),
    it("wax", "Wax spray", "oz", 16, "16 oz per bottle", 14.99, 1, 3),
    it("clay", "Clay bar", "bars", 6, "6 per box", 24.99, 0.5, 2),
    it("int", "Interior spray", "oz", 18, "18 oz per bottle", 9.49, 2, 3),
    it("pint", "Premium interior spray", "oz", 16, "16 oz per bottle", 17.99, 1, 3),
    it("carpet", "Carpet cleaner", "oz", 32, "32 oz per bottle", 12.49, 1.5, 3),
    it("compound", "Paint compound (Step 1)", "oz", 36, "36 oz per bottle", 39.99, 1, 2),
    it("polish", "Polish (Step 2)", "oz", 36, "36 oz per bottle", 39.99, 0.8, 2),
    it("headlight", "Headlight kit", "kits", 3, "3 per box", 29.99, 1, 2),
  ];
  const shopping: { id: string; reason: string }[] = [];
  const l = (
    minsAgo: number,
    action: string,
    status: "ok" | "error",
    detail: string,
    provider: string,
    reason?: string,
  ): LogEntry => ({ id: uid(), at: now - minsAgo * 60_000, action, status, detail, provider: provider === "fallback" ? "muse-spark-1.3" : "muse-spark-open", ...(reason ? { reason } : {}) });
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
  const settings: Settings = { businessName: "SudBudd MD", modelStatus: "live", base: { lat: 42.348, lng: -83.058 }, serviceRadiusMiles: 12 };
  return { conversations, messages, bookings, inventory, shopping, log, rules, tasks, settings };
}

let store = seed();
const listeners = new Map<Table, Set<() => void>>();
function emit(...tables: Table[]) {
  tables.forEach((t) => listeners.get(t)?.forEach((cb) => cb()));
}

export function subscribe(table: Table, callback: () => void): () => void {
  const callbacks = listeners.get(table) ?? new Set<() => void>();
  listeners.set(table, callbacks);
  callbacks.add(callback);
  return () => { callbacks.delete(callback); };
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
export async function addBooking(b: Pick<Booking, "title" | "date" | "time"> & Partial<Pick<Booking, "lat" | "lng" | "service">>) {
  // Calendar events without a job location occur at the seeded business base.
  store.bookings.push({ ...store.settings.base, service: "Other", ...b, id: uid() });
  emit("bookings");
}

/** Great-circle distance in statute miles. */
export function distanceMiles(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const a = Math.sin(radians(lat2 - lat1) / 2) ** 2 + Math.cos(radians(lat1)) * Math.cos(radians(lat2)) * Math.sin(radians(lng2 - lng1) / 2) ** 2;
  return 3958.7613 * 2 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, a))));
}

export async function getJobMapData() {
  const settings = await getSettings();
  const bookings = await getBookings();
  const jobs = bookings.map(job => ({ ...job, withinServiceArea: distanceMiles(settings.base.lat, settings.base.lng, job.lat, job.lng) <= settings.serviceRadiusMiles }));
  const latRadius = settings.serviceRadiusMiles / 69;
  const lngRadius = latRadius / Math.cos(settings.base.lat * Math.PI / 180);
  return {
    settings, jobs, newestId: bookings.at(-1)?.id,
    bounds: {
      south: Math.min(settings.base.lat - latRadius, ...jobs.map(j => j.lat)),
      north: Math.max(settings.base.lat + latRadius, ...jobs.map(j => j.lat)),
      west: Math.min(settings.base.lng - lngRadius, ...jobs.map(j => j.lng)),
      east: Math.max(settings.base.lng + lngRadius, ...jobs.map(j => j.lng)),
    },
  };
}

// ---------- Inbox ----------
/** Everyone who isn't spam is a customer. */
export function normalizeTags(tags: Tag[]): Tag[] {
  if (tags.includes("Spam")) return ["Spam"];
  return TAGS.filter((t) => t === "Customer" || tags.includes(t));
}
export type InboxFilter = Tag | "Flagged" | "Unread" | "Unread agent responses";
export const INBOX_FILTERS: InboxFilter[] = [...TAGS, "Flagged", "Unread", "Unread agent responses"];
/** A conversation must match every selected filter. */
export function matchesFilters(c: Pick<Conversation, "tags" | "flagged" | "unread" | "unreadAgent">, filters: InboxFilter[]): boolean {
  const tags = normalizeTags(c.tags);
  return filters.every((f) => f === "Flagged" ? c.flagged : f === "Unread" ? c.unread : f === "Unread agent responses" ? c.unreadAgent : tags.includes(f));
}
export async function getConversations(): Promise<(Conversation & { preview: string })[]> {
  return store.conversations.map((c) => {
    const last = [...store.messages].filter((m) => m.conversationId === c.id).sort((a, b) => b.at - a.at)[0];
    return { ...clone(c), tags: normalizeTags(c.tags), preview: last?.text ?? "" };
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
    delete c.flagNote;
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
      tags: ["Inquiry"],
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
export async function deleteRule(id: string) {
  store.rules = store.rules.filter((r) => r.id !== id);
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

// ---------- Cockpit visuals (synthetic, no external calls) ----------
export const DEMO_DATE = "2026-10-28";
export const DEMO_MONTH = { year: 2026, month: 9, start: 4, days: 31, label: "October 2026" };
export const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
/** Synthetic daily revenue for a 2026 month (0-11). Months after the demo date have no data. */
export function getMonthRevenue(month: number): { day: number; amount: number }[] | null {
  if (month > DEMO_MONTH.month) return null;
  const days = new Date(2026, month + 1, 0).getDate();
  const last = month === DEMO_MONTH.month ? 28 : days;
  return Array.from({ length: last }, (_, i) => ({ day: i + 1, amount: Math.round(60 + month * 8 + ((i * 37 + month * 11) % 9) * 12) }));
}
export function getYearRevenue() {
  return MONTHS.map((m, i) => { const d = getMonthRevenue(i); return { day: m.slice(0, 3), amount: d ? d.reduce((a, b) => a + b.amount, 0) : 0, hasData: !!d }; });
}
export async function getDashboard() {
  const inventory = await getInventory();
  const bookings = await getBookings();
  return {
    responseBefore: "12 hrs",
    responseSeconds: 8, // placeholder until the live agent reports real timings
    unreadMessages: store.conversations.filter(c => c.unread).length,
    lowItems: inventory.filter(i => stockPercent(i) < 50).length,
    bookingsToday: bookings.filter(b => b.date === DEMO_DATE).length,
    successRate: 96,
    trends: [[2, 1, 3, 2, 4, 3, 2], [42, 38, 30, 22, 16, 11, 8], [6, 5, 7, 4, 5, 3, 2], [5, 4, 4, 3, 3, 2, 2]],
  };
}

export async function runDemoBooking() {
  const booking = { title: "Lucía Morales · Full Detail", date: DEMO_DATE, time: "14:00", lat: 42.385, lng: -82.976, service: "Full Detail" as const };
  await addBooking(booking);
  store.log.unshift({ id: uid(), at: Date.now(), action: "create_booking", status: "ok", detail: booking.title, provider: "muse-spark-open" });
  emit("log");
  return booking;
}

export type VehicleSize = "Small" | "Medium" | "Large";
type Usage = Record<string, [number, number, number]>;
const RECIPES: Record<string, Usage> = {
  "Basic Exterior": { water: [3, 4, 6], soap: [4, 5, 7], gloves: [2, 2, 2], towels: [4, 6, 8], glass: [1, 1, 2] },
  "Premium Exterior": { water: [3, 4, 6], psoap: [4, 5, 7], gloves: [2, 2, 2], towels: [4, 6, 8], glass: [1, 1, 2], wax: [2, 2, 3], clay: [0.5, 0.5, 1] },
  "Basic Interior": { gloves: [2, 2, 2], towels: [6, 8, 10], glass: [1, 1, 2], int: [2, 2, 3] },
  "Premium Interior": { water: [0.5, 0.5, 1], gloves: [2, 2, 2], towels: [6, 8, 10], glass: [1, 1, 2], pint: [2, 2, 3], carpet: [2, 2, 4] },
  "Basic Detail": { water: [3, 4, 6], soap: [4, 5, 7], gloves: [2, 2, 2], towels: [10, 14, 18], glass: [1, 1, 2], int: [2, 2, 3] },
  "Premium Detail": { water: [3.5, 4.5, 7], psoap: [4, 5, 7], gloves: [2, 2, 2], towels: [10, 14, 18], glass: [1, 1, 2], wax: [2, 2, 3], clay: [0.5, 0.5, 1], pint: [2, 2, 3], carpet: [2, 2, 4] },
  "Standard Paint Correction": { water: [2, 3, 4], gloves: [2, 2, 2], wax: [2, 2, 3], clay: [0.5, 0.5, 1], compound: [3, 5, 8] },
  "2-Step Paint Correction": { water: [2, 3, 4], gloves: [2, 2, 2], wax: [2, 2, 3], clay: [0.5, 0.5, 1], compound: [3, 5, 8], polish: [3, 5, 8] },
  "Headlight Restoration": { headlight: [1, 1, 1] },
};
export const SERVICES = Object.keys(RECIPES);
const sizeIndex = (s: VehicleSize) => (s === "Small" ? 0 : s === "Medium" ? 1 : 2);
/** Per-job usage for a service and vehicle size: [{ id, amount }]. */
export function recipeFor(service: string, size: VehicleSize): { id: string; amount: number }[] {
  return Object.entries(RECIPES[service] ?? {}).map(([id, u]) => ({ id, amount: u[sizeIndex(size)] }));
}
export async function getRecipes() {
  return SERVICES.map((service) => ({ service }));
}
/** Deducts a job's supplies. Anything short is left untouched, explained, and added to the shopping list. */
export async function deductRecipe(service: string, size: VehicleSize) {
  const usage = recipeFor(service, size);
  const shortages: { id: string; name: string; need: number; have: number; unit: string }[] = [];
  for (const u of usage) {
    const item = store.inventory.find((i) => i.id === u.id)!;
    if (item.stock < u.amount) shortages.push({ id: item.id, name: item.name, need: u.amount, have: item.stock, unit: item.unit });
  }
  if (shortages.length === 0) {
    for (const u of usage) { const item = store.inventory.find((i) => i.id === u.id)!; item.stock = Math.round((item.stock - u.amount) * 100) / 100; }
  }
  for (const s of shortages) {
    const reason = `${service} (${size}) needs ${s.need} ${s.unit} of ${s.name}, only ${s.have} left`;
    if (!store.shopping.some((x) => x.id === s.id)) store.shopping.push({ id: s.id, reason });
  }
  const explanation = shortages.length ? `Can't fully stock this job: ${shortages.map((s) => `${s.name} is short (need ${s.need} ${s.unit}, have ${s.have})`).join("; ")}. Added to the shopping list.` : "";
  emit("inventory");
  return { ok: shortages.length === 0, usage, shortages, explanation };
}
export async function getShoppingList() {
  const manual = store.shopping;
  return store.inventory
    .filter((i) => stockPercent(i) < 60 || manual.some((m) => m.id === i.id))
    .map((i) => ({ ...clone(i), packs: Math.max(1, Math.ceil((i.capacity - i.stock) / i.packSize)), reason: manual.find((m) => m.id === i.id)?.reason }))
    .sort((a, b) => stockPercent(a) - stockPercent(b));
}
