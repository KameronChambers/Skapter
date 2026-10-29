/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Skapter data-access layer (Supabase version).
 * ALL app reads/writes go through this file. Pages never talk to the database directly.
 * Same exported names as the old in-memory version, so no page needs to change.
 *
 * Honesty notes (kept in code so they are not forgotten before submission):
 *  - getPerformance() text and getYearRevenue()/getMonthRevenue() are still SAMPLE data.
 *  - Dashboard response speed / success rate use real agent log rows once they exist,
 *    and fall back to placeholders until then.
 *  - Owner-triggered actions (Book job, Run demo booking) log provider "system", never a model name.
 */
import { supabase } from "@/integrations/supabase/client";

// The generated Database types don't know our tables, so use an untyped handle.
const db: any = supabase;

// ---------- Types (unchanged) ----------
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
  stock: number; // in units (available = on hand minus active holds)
  capacity: number; // in units
}
export type JobService = "Full Detail" | "Interior" | "Exterior Wash" | "Supply run" | "Ceramic Coat" | "Other";
export const JOB_SERVICES: JobService[] = ["Full Detail", "Interior", "Exterior Wash", "Supply run", "Ceramic Coat", "Other"];
export interface JobMapFilters {
  services?: JobService[];
  from?: string;
  to?: string;
  area?: "all" | "inside" | "outside";
}
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
  nextLevel: string;
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
/** UTC date (YYYY-MM-DD). UTC keeps server and browser identical, which avoids hydration mismatches. */
const todayIso = () => new Date().toISOString().slice(0, 10);

// ---------- Database helpers ----------
async function q<T = any>(p: PromiseLike<{ data: T; error: any }>, what: string): Promise<T> {
  const { data, error } = await p;
  if (error) throw new Error(`${what}: ${error.message ?? String(error)}`);
  return data;
}

async function logAction(
  tool: string,
  summary: string,
  status: "ok" | "error",
  provider: "muse-spark-open" | "muse-spark-1.3" | "system" = "system",
  reason?: string,
  details?: unknown,
) {
  await q(
    db.from("execution_log").insert({ tool, summary, status, provider, reason: reason ?? null, details: details ?? null }),
    "log action",
  );
}

// ---------- Live updates ----------
// Each page table maps to one or more database tables.
const TABLE_MAP: Record<Table, string[]> = {
  conversations: ["conversations"],
  messages: ["messages"],
  inventory: ["inventory", "reservations"],
  bookings: ["bookings"],
  log: ["execution_log"],
  rules: ["agent_rules"],
  tasks: ["tasks"],
  settings: ["settings"],
};
const localListeners = new Map<Table, Set<() => void>>();
function emit(...tables: Table[]) {
  tables.forEach((t) => localListeners.get(t)?.forEach((cb) => cb()));
}

/** Calls back when the table changes: instantly for our own writes, via realtime for everyone else's (e.g. the agent). */
export function subscribe(table: Table, callback: () => void): () => void {
  const set = localListeners.get(table) ?? new Set<() => void>();
  localListeners.set(table, set);
  set.add(callback);

  let timer: ReturnType<typeof setTimeout> | undefined;
  const debounced = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(callback, 120);
  };
  let channel: any;
  try {
    channel = db.channel(`skapter-${table}-${uid()}`);
    for (const t of TABLE_MAP[table]) {
      channel.on("postgres_changes", { event: "*", schema: "public", table: t }, debounced);
    }
    channel.subscribe();
  } catch (e) {
    console.warn("[skapter] realtime unavailable; live updates limited to this browser", e);
  }
  return () => {
    set.delete(callback);
    if (timer) clearTimeout(timer);
    if (channel) db.removeChannel(channel);
  };
}

// ---------- Settings ----------
export async function getSettings(): Promise<Settings> {
  const rows: { key: string; value: string }[] = await q(db.from("settings").select("key,value"), "settings");
  const m: Record<string, string> = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return {
    businessName: m.business_name ?? "SudBudd MD",
    modelStatus: m.model_status === "fallback" ? "fallback" : "live",
    base: { lat: Number(m.base_lat ?? 42.348), lng: Number(m.base_lng ?? -83.058) },
    serviceRadiusMiles: Number(m.service_radius_miles ?? 12),
  };
}
async function putSetting(key: string, value: string) {
  await q(db.from("settings").upsert({ key, value }), `save setting ${key}`);
  emit("settings");
}
export async function setModelStatus(status: Settings["modelStatus"]) {
  await putSetting("model_status", status);
}
export const SERVICE_RADIUS_RANGE = { min: 1, max: 50, step: 1 };
export async function setServiceRadiusMiles(radius: number) {
  if (!Number.isFinite(radius) || radius < SERVICE_RADIUS_RANGE.min || radius > SERVICE_RADIUS_RANGE.max) {
    throw new Error("Service radius must be between 1 and 50 miles.");
  }
  await putSetting("service_radius_miles", String(radius));
}

// ---------- Home ----------
/** SAMPLE text and score until weekly reports are generated by the agent. */
export async function getPerformance(): Promise<Performance> {
  return {
    score: 8,
    report:
      "Response time improved 18% week over week. The agent closed 6 bookings autonomously and escalated 1 conversation. Ceramic upsells are trending up; clay bar usage outpaced restocks.",
    mostPurchased: "Full Detail",
    leastPurchased: "Headlight Restoration",
    nextLevel: "Answer flagged chats within 1 hr and auto-confirm deposits to reach 10/10.",
  };
}
export function performanceLabel(score: number): string {
  if (score <= 2) return "Subpar";
  if (score <= 5) return "Serviceable";
  if (score <= 7) return "Adequate";
  return "Exemplary";
}
/** Built from live data: flagged unread chats, critically low supplies, plus one standing reminder. */
export async function getUrgentActions(): Promise<UrgentAction[]> {
  const [convs, inv] = await Promise.all([getConversations(), getInventory()]);
  const out: UrgentAction[] = [];
  for (const c of convs.filter((x) => x.flagged && x.unread)) {
    const hrs = Math.max(1, Math.round((Date.now() - c.lastAt) / HOUR));
    out.push({ id: `wait-${c.id}`, text: `Respond to ${c.name}, waiting ${hrs} hrs`, level: "red" });
  }
  for (const i of inv.filter((x) => stockPercent(x) < 30)) {
    out.push({ id: `stock-${i.id}`, text: `${i.name} stock critically low`, level: "red" });
  }
  out.push({ id: "u-discount", text: "Agent reminder: update seasonal discount code", level: "amber" });
  return out;
}
export async function getTasks(): Promise<Task[]> {
  const rows: any[] = await q(
    db.from("tasks").select("id,text,done").order("created_at", { ascending: true }).order("text", { ascending: true }),
    "tasks",
  );
  return rows.map((r) => ({ id: r.id, text: r.text, done: !!r.done }));
}
export async function toggleTask(id: string) {
  const rows: any[] = await q(db.from("tasks").select("done").eq("id", id).limit(1), "task");
  if (!rows[0]) return;
  await q(db.from("tasks").update({ done: !rows[0].done }).eq("id", id), "toggle task");
  emit("tasks");
}

type RawBooking = Booking & { createdAt: number };
async function getBookingsRaw(): Promise<RawBooking[]> {
  const [rows, settings] = await Promise.all([
    q<any[]>(
      db
        .from("bookings")
        .select("id,title,job_date,job_time,lat,lng,job_kind,created_at")
        .not("job_date", "is", null)
        .order("job_date", { ascending: true })
        .order("job_time", { ascending: true }),
      "bookings",
    ),
    getSettings(),
  ]);
  return rows.map((r) => ({
    id: r.id,
    title: r.title ?? "Booking",
    date: r.job_date,
    time: r.job_time ?? "09:00",
    lat: r.lat ?? settings.base.lat,
    lng: r.lng ?? settings.base.lng,
    service: (JOB_SERVICES.includes(r.job_kind) ? r.job_kind : "Other") as JobService,
    createdAt: Date.parse(r.created_at),
  }));
}
const toBooking = (r: RawBooking): Booking => ({
  id: r.id,
  title: r.title,
  date: r.date,
  time: r.time,
  lat: r.lat,
  lng: r.lng,
  service: r.service,
});
export async function getBookings(): Promise<Booking[]> {
  return (await getBookingsRaw()).map(toBooking);
}
export async function addBooking(
  b: Pick<Booking, "title" | "date" | "time"> & Partial<Pick<Booking, "lat" | "lng" | "service">>,
) {
  // Calendar events without a job location occur at the business base.
  const { base } = await getSettings();
  await q(
    db.from("bookings").insert({
      title: b.title,
      job_date: b.date,
      job_time: b.time,
      lat: b.lat ?? base.lat,
      lng: b.lng ?? base.lng,
      job_kind: b.service ?? "Other",
      status: "confirmed",
    }),
    "add booking",
  );
  emit("bookings");
}

/** Great-circle distance in statute miles. */
export function distanceMiles(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const radians = (degrees: number) => (degrees * Math.PI) / 180;
  const a =
    Math.sin(radians(lat2 - lat1) / 2) ** 2 +
    Math.cos(radians(lat1)) * Math.cos(radians(lat2)) * Math.sin(radians(lng2 - lng1) / 2) ** 2;
  return 3958.7613 * 2 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, a))));
}

export async function getJobMapData(filters: JobMapFilters = {}) {
  const settings = await getSettings();
  const raw = await getBookingsRaw();
  const newestId = [...raw].sort((a, b) => b.createdAt - a.createdAt)[0]?.id;
  const bookings = raw.map(toBooking);
  const allJobs = bookings.map((job) => {
    const distance = distanceMiles(settings.base.lat, settings.base.lng, job.lat, job.lng);
    return { ...job, distanceMiles: distance, withinServiceArea: distance <= settings.serviceRadiusMiles };
  });
  const jobs = allJobs.filter(
    (job) =>
      (!filters.services || filters.services.includes(job.service)) &&
      (!filters.from || job.date >= filters.from) &&
      (!filters.to || job.date <= filters.to) &&
      (filters.area !== "inside" || job.withinServiceArea) &&
      (filters.area !== "outside" || !job.withinServiceArea),
  );
  const latRadius = settings.serviceRadiusMiles / 69;
  const lngRadius = latRadius / Math.cos((settings.base.lat * Math.PI) / 180);
  return {
    settings,
    jobs,
    schedule: [...jobs].sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`)),
    newestId,
    counts: {
      inside: jobs.filter((job) => job.withinServiceArea).length,
      outside: jobs.filter((job) => !job.withinServiceArea).length,
    },
    bounds: {
      south: Math.min(settings.base.lat - latRadius, ...allJobs.map((j) => j.lat)),
      north: Math.max(settings.base.lat + latRadius, ...allJobs.map((j) => j.lat)),
      west: Math.min(settings.base.lng - lngRadius, ...allJobs.map((j) => j.lng)),
      east: Math.max(settings.base.lng + lngRadius, ...allJobs.map((j) => j.lng)),
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
export function matchesFilters(
  c: Pick<Conversation, "tags" | "flagged" | "unread" | "unreadAgent">,
  filters: InboxFilter[],
): boolean {
  const tags = normalizeTags(c.tags);
  return filters.every((f) =>
    f === "Flagged" ? c.flagged : f === "Unread" ? c.unread : f === "Unread agent responses" ? c.unreadAgent : tags.includes(f),
  );
}
const CHANNEL_LABEL: Record<string, Channel> = {
  whatsapp: "WhatsApp",
  instagram: "Instagram",
  messenger: "Messenger",
  simulated: "Simulated",
};
export async function getConversations(): Promise<(Conversation & { preview: string })[]> {
  const [rows, msgs] = await Promise.all([
    q<any[]>(db.from("conversations").select("*").order("last_message_at", { ascending: false }), "conversations"),
    q<any[]>(
      db.from("messages").select("conversation_id,body,created_at").order("created_at", { ascending: false }).limit(300),
      "previews",
    ),
  ]);
  const preview = new Map<string, string>();
  for (const m of msgs) if (!preview.has(m.conversation_id)) preview.set(m.conversation_id, m.body);
  return rows.map((r) => {
    const channel = CHANNEL_LABEL[r.channel] ?? "Simulated";
    const rawTags: Tag[] = r.category === "spam" ? ["Spam"] : (r.tags ?? ["Inquiry"]);
    return {
      id: r.id,
      name: r.name ?? "Unknown",
      channel,
      tags: normalizeTags(rawTags),
      unread: !!r.unread,
      unreadAgent: !!r.agent_unread,
      flagged: !!r.flagged,
      ...(r.flag_note ? { flagNote: r.flag_note } : {}),
      lastAt: Date.parse(r.last_message_at),
      ...(r.address ? { address: r.address } : {}),
      preferredContact: r.preferred_contact ?? channel,
      purchases: r.purchases ?? [],
      preview: preview.get(r.id) ?? "",
    };
  });
}
export async function getMessages(conversationId: string): Promise<Message[]> {
  const rows: any[] = await q(
    db.from("messages").select("id,conversation_id,sender,body,created_at").eq("conversation_id", conversationId).order("created_at", { ascending: true }),
    "messages",
  );
  return rows.map((r) => ({ id: r.id, conversationId: r.conversation_id, sender: r.sender, text: r.body, at: Date.parse(r.created_at) }));
}
export async function markRead(conversationId: string) {
  await q(db.from("conversations").update({ unread: false, agent_unread: false }).eq("id", conversationId), "mark read");
  emit("conversations");
}
export async function sendOwnerMessage(conversationId: string, text: string) {
  await q(db.from("messages").insert({ conversation_id: conversationId, sender: "owner", body: text, processed: true }), "send message");
  await q(db.from("conversations").update({ last_message_at: new Date().toISOString() }).eq("id", conversationId), "update conversation");
  emit("messages", "conversations");
}
export async function flagConversation(conversationId: string, note: string) {
  await q(db.from("conversations").update({ flagged: true, flag_note: note }).eq("id", conversationId), "flag");
  emit("conversations");
}
export async function unflagConversation(conversationId: string) {
  await q(db.from("conversations").update({ flagged: false, flag_note: null }).eq("id", conversationId), "unflag");
  emit("conversations");
}
/** Sends a message as a simulated customer. The agent picks it up exactly like a real DM. Returns the conversation id. */
export async function sendSimulatedCustomerMessage(text: string): Promise<string> {
  const existing: any[] = await q(db.from("conversations").select("id").eq("channel", "simulated").limit(1), "simulator");
  const now = new Date().toISOString();
  let id: string | undefined = existing[0]?.id;
  if (!id) {
    const created: any[] = await q(
      db
        .from("conversations")
        .insert({
          name: "Simulated Customer",
          channel: "simulated",
          category: "inquiry",
          tags: ["Inquiry"],
          unread: true,
          preferred_contact: "Simulated",
          last_message_at: now,
        })
        .select("id"),
      "simulator conversation",
    );
    id = created[0].id as string;
  } else {
    await q(db.from("conversations").update({ unread: true, last_message_at: now }).eq("id", id), "simulator conversation");
  }
  await q(db.from("messages").insert({ conversation_id: id, sender: "customer", body: text, processed: false }), "simulator message");
  emit("messages", "conversations");
  return id as string;
}

// ---------- Agent ----------
/** Placeholder: the chat box gets wired to the real agent function in a later step. */
export async function askAgent(text: string): Promise<string> {
  return `[placeholder] The agent isn't connected yet. You asked: "${text}"`;
}
export async function getRules(): Promise<Rule[]> {
  const rows: any[] = await q(
    db.from("agent_rules").select("id,text,enabled").order("created_at", { ascending: false }).order("text", { ascending: true }),
    "rules",
  );
  return rows.map((r) => ({ id: r.id, text: r.text, enabled: !!r.enabled }));
}
export async function saveRule(text: string) {
  await q(db.from("agent_rules").insert({ text, enabled: true }), "save rule");
  emit("rules");
}
export async function deleteRule(id: string) {
  await q(db.from("agent_rules").delete().eq("id", id), "delete rule");
  emit("rules");
}
export async function toggleRule(id: string) {
  const rows: any[] = await q(db.from("agent_rules").select("enabled").eq("id", id).limit(1), "rule");
  if (!rows[0]) return;
  await q(db.from("agent_rules").update({ enabled: !rows[0].enabled }).eq("id", id), "toggle rule");
  emit("rules");
}
export async function getExecutionLog(): Promise<LogEntry[]> {
  const rows: any[] = await q(
    db.from("execution_log").select("id,tool,summary,status,provider,reason,created_at").order("created_at", { ascending: false }).limit(200),
    "execution log",
  );
  return rows.map((r) => ({
    id: r.id,
    at: Date.parse(r.created_at),
    action: r.tool,
    status: r.status,
    detail: r.summary,
    provider: r.provider,
    ...(r.reason ? { reason: r.reason } : {}),
  }));
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
const ITEM_ORDER = ["water", "soap", "psoap", "gloves", "towels", "glass", "wax", "clay", "int", "pint", "carpet", "compound", "polish", "headlight"];
const round2 = (n: number) => Math.round(n * 100) / 100;
/** Stock shown = on hand minus active (unexpired) holds, so gauges drop the moment the agent reserves supplies. */
export async function getInventory(): Promise<InventoryItem[]> {
  const [items, holds] = await Promise.all([
    q<any[]>(db.from("inventory").select("*"), "inventory"),
    q<any[]>(
      db.from("reservations").select("items").eq("status", "held").gt("expires_at", new Date().toISOString()),
      "holds",
    ),
  ]);
  const held: Record<string, number> = {};
  for (const h of holds) for (const [k, v] of Object.entries(h.items ?? {})) held[k] = (held[k] ?? 0) + Number(v);
  const rank = (k: string) => (ITEM_ORDER.includes(k) ? ITEM_ORDER.indexOf(k) : 99);
  return items
    .map((r) => {
      const packSize = Number(r.pack_size);
      const showUnit = r.unit === "oz" || r.unit === "gal";
      return {
        id: r.key,
        name: r.label,
        unit: r.unit,
        packSize,
        packLabel: `${packSize}${showUnit ? ` ${r.unit}` : ""} per ${r.pack_name}`,
        price: Number(r.pack_price),
        stock: round2(Number(r.on_hand) - (held[r.key] ?? 0)),
        capacity: Number(r.par_packs) * packSize,
      } as InventoryItem;
    })
    .sort((a, b) => rank(a.id) - rank(b.id));
}

// ---------- Demo ----------
export const DEMO_DATE = todayIso();
const _now = new Date();
const _y = _now.getUTCFullYear();
const _m = _now.getUTCMonth();
/** Current month (UTC). */
export const DEMO_MONTH = {
  year: _y,
  month: _m,
  start: new Date(Date.UTC(_y, _m, 1)).getUTCDay(),
  days: new Date(Date.UTC(_y, _m + 1, 0)).getUTCDate(),
  label: new Date(Date.UTC(_y, _m, 1)).toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" }),
};
export const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** SAMPLE data: synthetic daily revenue for a 2026 month (0-11). Months after the current one have no data. */
export function getMonthRevenue(month: number): { day: number; amount: number }[] | null {
  if (month > DEMO_MONTH.month) return null;
  const days = new Date(2026, month + 1, 0).getDate();
  const last = month === DEMO_MONTH.month ? Number(DEMO_DATE.slice(8, 10)) : days;
  return Array.from({ length: last }, (_, i) => ({ day: i + 1, amount: Math.round(60 + month * 8 + ((i * 37 + month * 11) % 9) * 12) }));
}
export function getYearRevenue() {
  return MONTHS.map((m, i) => {
    const d = getMonthRevenue(i);
    return { day: m.slice(0, 3), amount: d ? d.reduce((a, b) => a + b.amount, 0) : 0, hasData: !!d };
  });
}

export async function getDashboard() {
  const [inventory, bookings, convs, metrics] = await Promise.all([
    getInventory(),
    getBookings(),
    getConversations(),
    q<any[]>(
      db.from("execution_log").select("status,details").neq("provider", "system").order("created_at", { ascending: false }).limit(200),
      "metrics",
    ),
  ]);
  const latencies = metrics.map((r) => Number(r.details?.latency_ms)).filter((n) => Number.isFinite(n) && n > 0);
  const responseSeconds = latencies.length
    ? Math.round((latencies.reduce((a, b) => a + b, 0) / latencies.length / 1000) * 10) / 10
    : 8; // placeholder until the agent has logged real timings
  const successRate = metrics.length
    ? Math.round((metrics.filter((r) => r.status === "ok").length / metrics.length) * 100)
    : 96; // placeholder until the agent has logged real runs
  return {
    responseBefore: "12 hrs",
    responseSeconds,
    unreadMessages: convs.filter((c) => c.unread).length,
    lowItems: inventory.filter((i) => stockPercent(i) < 50).length,
    bookingsToday: bookings.filter((b) => b.date === todayIso()).length,
    successRate,
    trends: [[2, 1, 3, 2, 4, 3, 2], [42, 38, 30, 22, 16, 11, 8], [6, 5, 7, 4, 5, 3, 2], [5, 4, 4, 3, 3, 2, 2]],
  };
}

/** Owner-triggered demo button. Logged as "system" (not a model call). */
export async function runDemoBooking() {
  const booking = { title: "Lucía Morales · Full Detail (demo)", date: todayIso(), time: "14:00", lat: 42.385, lng: -82.976, service: "Full Detail" as const };
  await addBooking(booking);
  await logAction("create_booking", `Demo booking: ${booking.title}`, "ok", "system");
  emit("log");
  return booking;
}

export async function resetDemo() {
  await q(db.rpc("reset_demo"), "reset demo");
  manualShopping.clear();
  emit("conversations", "messages", "inventory", "bookings", "log", "rules", "tasks", "settings");
}

// ---------- Recipes (the database `services` table holds the same recipes for the reservation logic) ----------
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
const SERVICE_IDS: Record<string, string> = {
  "Basic Exterior": "basic_exterior",
  "Premium Exterior": "premium_exterior",
  "Basic Interior": "basic_interior",
  "Premium Interior": "premium_interior",
  "Basic Detail": "basic_detail",
  "Premium Detail": "premium_detail",
  "Standard Paint Correction": "standard_paint",
  "2-Step Paint Correction": "two_step_paint",
  "Headlight Restoration": "headlight",
};
const SIZE_LETTER: Record<VehicleSize, string> = { Small: "S", Medium: "M", Large: "L" };
export const SERVICES = Object.keys(RECIPES);
const sizeIndex = (s: VehicleSize) => (s === "Small" ? 0 : s === "Medium" ? 1 : 2);
/** Per-job usage for a service and vehicle size: [{ id, amount }]. */
export function recipeFor(service: string, size: VehicleSize): { id: string; amount: number }[] {
  return Object.entries(RECIPES[service] ?? {}).map(([id, u]) => ({ id, amount: u[sizeIndex(size)] }));
}
export async function getRecipes() {
  return SERVICES.map((service) => ({ service }));
}

/** Shortage reasons shown on the shopping list (this browser session only; the log keeps the permanent record). */
const manualShopping = new Map<string, string>();

/**
 * Owner "Book job · deduct" button. Uses the same atomic database logic as the agent:
 * reserve (locks stock, fails with the exact shortage), then confirm (permanent deduction).
 */
export async function deductRecipe(service: string, size: VehicleSize) {
  const usage = recipeFor(service, size);
  const serviceId = SERVICE_IDS[service];
  if (!serviceId) throw new Error(`Unknown service: ${service}`);

  const res: any = await q(
    db.rpc("reserve_booking", { p_conversation: null, p_service: serviceId, p_size: SIZE_LETTER[size] }),
    "reserve_booking",
  );

  if (res?.ok && res.reservation_id) {
    const confirmed: any = await q(db.rpc("confirm_reservation", { p_id: res.reservation_id }), "confirm_reservation");
    if (!confirmed?.ok) throw new Error(`Could not confirm reservation: ${confirmed?.error ?? "unknown error"}`);
    await logAction("reserve_stock", `${service} (${size}): supplies deducted`, "ok", "system");
    emit("inventory", "log");
    return { ok: true, usage, shortages: [] as { id: string; name: string; need: number; have: number; unit: string }[], explanation: "" };
  }

  const inventory = await getInventory();
  const shortages = ((res?.short ?? []) as { item: string; need: number; available: number }[]).map((s) => {
    const item = inventory.find((i) => i.id === s.item);
    return { id: s.item, name: item?.name ?? s.item, need: s.need, have: round2(s.available), unit: item?.unit ?? "" };
  });
  for (const s of shortages) {
    manualShopping.set(s.id, `${service} (${size}) needs ${s.need} ${s.unit} of ${s.name}, only ${s.have} left`);
  }
  const explanation = shortages.length
    ? `Can't fully stock this job: ${shortages.map((s) => `${s.name} is short (need ${s.need} ${s.unit}, have ${s.have})`).join("; ")}. Added to the shopping list.`
    : `Could not reserve supplies (${res?.error ?? "unknown error"}).`;
  await logAction("reserve_stock", explanation, "error", "system", "Insufficient stock");
  emit("inventory", "log");
  return { ok: false, usage, shortages, explanation };
}

export async function getShoppingList() {
  const inventory = await getInventory();
  return inventory
    .filter((i) => stockPercent(i) < 60 || manualShopping.has(i.id))
    .map((i) => ({
      ...i,
      packs: Math.max(1, Math.ceil((i.capacity - i.stock) / i.packSize)),
      reason: manualShopping.get(i.id),
    }))
    .sort((a, b) => stockPercent(a) - stockPercent(b));
}
