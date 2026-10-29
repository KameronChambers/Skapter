import { createFileRoute } from "@tanstack/react-router";
import { Activity, ArrowUpRight, CalendarCheck, Car, ChevronLeft, ChevronRight, Clock, Expand, Lightbulb, MailWarning, MapPin, Package, Play, Plus, Zap } from "lucide-react";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { ClientOnly } from "@tanstack/react-router";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useData } from "@/hooks/use-data";
import { addBooking, DEMO_MONTH, getBookings, getDashboard, getMonthRevenue, getYearRevenue, MONTHS, getExecutionLog, getPerformance, getTasks, getUrgentActions, runDemoBooking, toggleTask } from "@/lib/data";
import { Dot, PageTitle, Panel, Pill, fmtTime } from "@/components/skapter/ui";
import { CountUp, pipelineSteps, Ring, toolIcons } from "@/components/skapter/visuals";
const JobMap = lazy(() => import("@/components/skapter/JobMap").then(m => ({ default: m.JobMap })));

export const Route = createFileRoute("/")({ head: () => ({ meta: [
  { title: "Operations · Skapter" }, { name: "description", content: "SudBudd MD live operations, bookings, revenue and activity." },
  { property: "og:title", content: "Operations · Skapter" }, { property: "og:description", content: "SudBudd MD live operations, bookings, revenue and activity." },
  { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
] }), component: HomePage });

function HomePage() {
  const dashboard = useData(getDashboard, ["bookings", "inventory", "conversations"]);
  const perf = useData(getPerformance, []);
  const urgent = useData(getUrgentActions, []);
  const tasks = useData(getTasks, ["tasks"]);
  const log = useData(getExecutionLog, ["log"]) ?? [];
  const [step, setStep] = useState(-1);
  const [running, setRunning] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastLog = useRef<string | null>(null);
  const animate = () => {
    if (timer.current) clearInterval(timer.current);
    setStep(0);
    let index = 0;
    timer.current = setInterval(() => { index++; setStep(index); if (index >= 4 && timer.current) { clearInterval(timer.current); setRunning(false); } }, 550);
  };
  useEffect(() => { const id = log[0]?.id; if (id && lastLog.current && id !== lastLog.current) animate(); lastLog.current = id ?? null; }, [log]);
  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);
  const [mapOpen, setMapOpen] = useState(false);
  const stats: { label: string; value: number; prefix?: string; suffix?: string; before?: string | undefined; icon: typeof Clock }[] = [{ label: "Bookings today", value: dashboard?.bookingsToday ?? 0, icon: CalendarCheck }, { label: "Response speed", value: dashboard?.responseSeconds ?? 0, suffix: "s", before: dashboard?.responseBefore, icon: Clock }, { label: "Unread messages", value: dashboard?.unreadMessages ?? 0, icon: MailWarning }, { label: "Items low", value: dashboard?.lowItems ?? 0, icon: Package }];
  return <div className="home-cockpit flex min-h-full flex-col gap-4">
    <PageTitle sub={<Pill tone="green">Live overview</Pill>}>SudBudd MD</PageTitle>
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{stats.map((s, i) => <section key={s.label} className="panel stat-tile p-4"><div className="flex items-center justify-between text-xs text-muted-foreground"><span>{s.label}</span><s.icon className="size-4 text-primary" /></div><div className="mt-3 flex items-end justify-between gap-2">{s.before ? <div className="flex items-end gap-3"><div><p className="text-[10px] text-muted-foreground">Before</p><span className="num text-lg text-muted-foreground line-through">{s.before}</span></div><div><p className="text-[10px] text-primary">After</p><span className="text-3xl"><CountUp value={s.value} suffix={s.suffix} /></span></div></div> : <span className="text-3xl"><CountUp value={s.value} prefix={s.prefix} suffix={s.suffix} /></span>}<div className="h-10 w-24"><ResponsiveContainer><AreaChart data={(dashboard?.trends[i] ?? []).map(value => ({ value }))}><Area dataKey="value" stroke="var(--primary)" fill="var(--primary)" fillOpacity={0.1} strokeWidth={2} /></AreaChart></ResponsiveContainer></div></div></section>)}</div>
    <Panel title={<span className="flex items-center gap-2"><Zap className="size-4 text-primary" /> Live pipeline</span>} action={<Button size="sm" disabled={running} onClick={async () => { setRunning(true); animate(); await runDemoBooking(); }}><Play className="size-3" /> Run demo booking</Button>}>
      <div className="grid grid-cols-5 gap-1">{pipelineSteps.map((s, i) => <div key={s.label} className="relative text-center"><div className={"relative z-10 mx-auto grid size-10 place-items-center rounded-lg border transition-all " + (i <= step ? "border-primary/40 bg-primary/10 text-primary live-glow" : "bg-card text-muted-foreground")}><s.icon className="size-5" /></div>{i < 4 && <div className={"absolute top-5 left-[60%] h-px w-[80%] " + (i < step ? "bg-primary" : "bg-border")} />}<div className="mt-2 text-[11px] md:text-xs">{s.label}</div><div className="mt-1 h-7 text-[10px] text-primary">{step === i && <>Lucía Morales<br />Full Detail</>}</div></div>)}</div>
    </Panel>
    <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr_1fr]">
      <RevenuePanel />
      <Panel title="Agent performance" action={<Pill tone="green">Exemplary</Pill>}><div className="flex items-center gap-4"><div className="w-28"><Ring value={(perf?.score ?? 0) * 10}><span className="num text-3xl">{perf?.score ?? 0}<span className="text-sm text-muted-foreground">/10</span></span></Ring></div><div className="space-y-3 text-xs"><div><p className="text-muted-foreground">Top service</p><p className="mt-1">{perf?.mostPurchased}</p></div><div><p className="text-muted-foreground">Autonomous bookings</p><p className="num mt-1 text-xl text-primary">6</p></div></div></div><p className="mt-3 flex gap-2 border-t pt-3 text-[11px] text-muted-foreground"><Lightbulb className="size-3.5 shrink-0 text-primary" /><span><span className="text-foreground">Next level:</span> {perf?.nextLevel}</span></p></Panel>
      <Panel title={<span className="flex items-center gap-2"><MapPin className="size-4 text-primary" /> Detroit jobs</span>} action={<Button variant="ghost" size="sm" onClick={() => setMapOpen(true)}><Expand className="size-3.5" /> Expand</Button>}><ClientOnly fallback={<div className="job-map-frame" />}><Suspense fallback={<div className="job-map-frame" />}><JobMap /></Suspense></ClientOnly></Panel>
    </div>
    <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr_1fr]">
      <Panel title="Activity" action={<Pill tone="green">Live</Pill>}><div className="space-y-0">{log.slice(0, 4).map(l => { const Icon = toolIcons[l.action] ?? Activity; return <div key={l.id} className="timeline-entry flex gap-3 border-l border-border pb-3 pl-3"><span className="-ml-6 grid size-6 shrink-0 place-items-center rounded-full border bg-card text-primary"><Icon className="size-3" /></span><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2 text-xs"><span>{l.action.replaceAll("_", " ")}</span><Dot tone={l.status === "ok" ? "green" : "red"} /></div><p className="mt-1 truncate text-[11px] text-muted-foreground">{l.detail}</p></div><span className="num text-[10px] text-muted-foreground">{fmtTime(l.at).slice(0, 5)}</span></div>; })}</div></Panel>
      <Panel title="Needs attention" action={<Pill tone="red">3</Pill>}><ul className="divide-y">{urgent?.map(u => <li key={u.id} className="flex items-center gap-2 py-3 text-xs"><Dot tone={u.level} /><span>{u.id === "u1" ? "Mark Vance · 22h" : u.id === "u2" ? "Clay bar · critical" : "Seasonal code update"}</span><ArrowUpRight className="ml-auto size-3 text-muted-foreground" /></li>)}</ul></Panel>
      <Panel title="Tasks" action={<Pill>AI-drafted</Pill>}><ul className="divide-y">{tasks?.map(t => <li key={t.id} className="flex items-center gap-3 py-3 text-xs"><Checkbox id={t.id} checked={t.done} onCheckedChange={() => toggleTask(t.id)} /><label htmlFor={t.id} className={t.done ? "text-muted-foreground line-through" : ""}>{t.id === "t1" ? "Review agent responses" : t.id === "t2" ? "Supply run · 16:00" : "Roy Henderson · Detail"}</label></li>)}</ul></Panel>
    </div>
    <CalendarPanel />
    <Dialog open={mapOpen} onOpenChange={setMapOpen}><DialogContent className="max-h-[94dvh] max-w-[95vw] overflow-y-auto sm:max-w-5xl"><DialogHeader><DialogTitle className="flex items-center gap-2"><MapPin className="size-4 text-primary" /> Detroit job schedule</DialogTitle></DialogHeader>{mapOpen && <ClientOnly fallback={<div className="job-map-frame" />}><Suspense fallback={<div className="job-map-frame" />}><JobMap expanded /></Suspense></ClientOnly>}</DialogContent></Dialog>
  </div>;
}
function CalendarPanel() {
  const bookings = useData(getBookings, ["bookings"]) ?? [];
  const [cursor, setCursor] = useState(DEMO_MONTH);
  const [today, setToday] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", date: "", time: "10:00" });
  useEffect(() => { setToday(new Date().toISOString().slice(0, 10)); }, []);
  const move = (offset: number) => { const d = new Date(cursor.year, cursor.month + offset, 1); setCursor({ year: d.getFullYear(), month: d.getMonth(), start: d.getDay(), days: new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(), label: d.toLocaleString("en-US", { month: "long", year: "numeric" }) }); };
  const cells = Array.from({ length: Math.ceil((cursor.start + cursor.days) / 7) * 7 }, (_, i) => i - cursor.start + 1);
  return <Panel title={<span className="flex items-center gap-2"><CalendarCheck className="size-4 text-primary" /> Calendar <span className="num hidden text-xs font-normal text-muted-foreground sm:inline">{cursor.label}</span></span>} action={<div className="flex gap-1"><Button variant="ghost" size="icon" aria-label="Previous month" onClick={() => move(-1)}><ChevronLeft /></Button><Button variant="ghost" size="icon" aria-label="Next month" onClick={() => move(1)}><ChevronRight /></Button><Button variant="outline" size="sm" onClick={() => setOpen(true)}><Plus /> Add event</Button></div>}>
    <div className="grid grid-cols-7 pb-2 text-[10px] text-muted-foreground">{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => <span key={d}>{d}</span>)}</div><div className="calendar-grid grid auto-rows-[65px] grid-cols-7 overflow-hidden rounded-md border">{cells.map((d, i) => { const valid = d > 0 && d <= cursor.days; const date = `${cursor.year}-${String(cursor.month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`; return <div key={i} className="overflow-hidden border-r border-b p-1"><span className={"num text-[10px] " + (date === today ? "rounded bg-primary/15 px-1 text-primary" : "text-muted-foreground")}>{valid ? d : ""}</span>{valid && bookings.filter(b => b.date === date).map(b => <div key={b.id} title={`${b.time} ${b.title}`} className="mt-1 flex items-center gap-1 truncate rounded border border-primary/20 bg-primary/10 px-1 text-[9px] text-primary"><Car className="size-3 shrink-0" /><span className="truncate">{b.title.split(" · ")[1] ?? b.title}</span></div>)}</div>; })}</div>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent><DialogHeader><DialogTitle>Add event</DialogTitle></DialogHeader><Input placeholder="Title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /><div className="flex gap-2"><Input aria-label="Event date" type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /><Input aria-label="Event time" type="time" value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} /></div><DialogFooter><Button disabled={!form.title || !form.date} onClick={async () => { await addBooking(form); setOpen(false); setForm({ title: "", date: "", time: "10:00" }); }}>Save</Button></DialogFooter></DialogContent></Dialog>
  </Panel>;
}

function RevenuePanel() {
  const [pick, setPick] = useState(String(DEMO_MONTH.month));
  const all = pick === "all";
  const data = all ? getYearRevenue() : getMonthRevenue(Number(pick));
  const total = data?.reduce((a, b) => a + b.amount, 0) ?? 0;
  return <Panel title="Revenue" action={<Select value={pick} onValueChange={setPick}><SelectTrigger aria-label="Revenue period" className="h-7 w-[150px] text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All months</SelectItem>{MONTHS.map((m, i) => <SelectItem key={m} value={String(i)}>{m}{i > DEMO_MONTH.month ? " · no data" : ""}</SelectItem>)}</SelectContent></Select>}>
    {data ? <><div className="mb-2 flex items-baseline gap-3"><span className="num text-2xl">${total.toLocaleString("en-US")}</span><span className="text-xs text-muted-foreground">{all ? "2026 by month" : "by day"}</span></div><div className="h-36"><ResponsiveContainer><AreaChart data={data}><defs><linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--primary)" stopOpacity={0.25} /><stop offset="1" stopColor="var(--primary)" stopOpacity={0} /></linearGradient></defs><XAxis dataKey="day" tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} axisLine={false} tickLine={false} /><Tooltip contentStyle={{ background: "var(--card)", borderColor: "var(--border)", color: "var(--foreground)" }} /><Area dataKey="amount" stroke="var(--primary)" fill="url(#revenueFill)" strokeWidth={2} /></AreaChart></ResponsiveContainer></div></> : <div className="grid h-44 place-items-center text-sm text-muted-foreground">No data yet</div>}
  </Panel>;
}
