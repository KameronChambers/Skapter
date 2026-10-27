import { createFileRoute } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useData } from "@/hooks/use-data";
import {
  addBooking,
  getBookings,
  getPerformance,
  getTasks,
  getUrgentActions,
  performanceLabel,
  toggleTask,
} from "@/lib/data";
import { Dot, PageTitle, Panel, Pill } from "@/components/skapter/ui";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Home · Skapter" },
      { name: "description", content: "Performance, urgent actions, tasks and bookings for SudBudd MD." },
      { property: "og:title", content: "Home · Skapter" },
      { property: "og:description", content: "Performance, urgent actions, tasks and bookings for SudBudd MD." },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const perf = useData(getPerformance, []);
  const urgent = useData(getUrgentActions, []);
  const tasks = useData(getTasks, ["tasks"]);

  return (
    <div className="flex h-full flex-col">
      <PageTitle>SudBudd MD</PageTitle>
      <div className="grid min-h-0 flex-1 grid-cols-3 grid-rows-2 gap-4">
        <Panel title="Performance" action={<Pill>This week</Pill>}>
          {perf && (
            <div className="space-y-4">
              <div className="flex items-baseline gap-3">
                <span className="num text-4xl font-medium">{perf.score}/10</span>
                <Pill tone="green">{performanceLabel(perf.score)}</Pill>
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">{perf.report}</p>
              <div className="divide-y text-sm">
                <div className="flex justify-between py-2">
                  <span className="text-muted-foreground">Most purchased</span>
                  <span>{perf.mostPurchased}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-muted-foreground">Least purchased</span>
                  <span>{perf.leastPurchased}</span>
                </div>
              </div>
            </div>
          )}
        </Panel>
        <Panel title="Urgent Actions">
          <ul className="divide-y">
            {urgent?.map((u) => (
              <li key={u.id} className="flex items-center gap-3 py-3 text-sm">
                <Dot tone={u.level} />
                {u.text}
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title="Tasks" action={<Pill>AI-drafted</Pill>}>
          <ul className="divide-y">
            {tasks?.map((t) => (
              <li key={t.id} className="flex items-center gap-3 py-3 text-sm">
                <Checkbox id={t.id} checked={t.done} onCheckedChange={() => toggleTask(t.id)} />
                <label htmlFor={t.id} className={t.done ? "text-muted-foreground line-through" : ""}>
                  {t.text}
                </label>
              </li>
            ))}
          </ul>
        </Panel>
        <CalendarPanel />
      </div>
    </div>
  );
}

function CalendarPanel() {
  const bookings = useData(getBookings, ["bookings"]) ?? [];
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", date: "", time: "10:00" });

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const start = new Date(year, month, 1).getDay();
  const days = new Date(year, month + 1, 0).getDate();
  const cells = Array.from({ length: Math.ceil((start + days) / 7) * 7 }, (_, i) => i - start + 1);
  const today = new Date();
  const key = (d: number) => `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

  return (
    <Panel
      className="col-span-3"
      title={
        <span className="flex items-center gap-2">
          Calendar
          <span className="num text-sm font-normal text-muted-foreground">
            {cursor.toLocaleString("en-US", { month: "long", year: "numeric" })}
          </span>
        </span>
      }
      action={
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => setCursor(new Date(year, month - 1, 1))}>
            <ChevronLeft className="size-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setCursor(new Date(year, month + 1, 1))}>
            <ChevronRight className="size-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
            <Plus className="size-3.5" /> Add event
          </Button>
        </div>
      }
      bodyClassName="flex flex-col"
    >
      <div className="grid grid-cols-7 pb-1 text-xs text-muted-foreground">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="px-2">{d}</div>
        ))}
      </div>
      <div className="grid flex-1 auto-rows-fr grid-cols-7 overflow-hidden rounded-md border">
        {cells.map((d, i) => {
          const valid = d >= 1 && d <= days;
          const items = valid ? bookings.filter((b) => b.date === key(d)) : [];
          const isToday =
            valid && d === today.getDate() && month === today.getMonth() && year === today.getFullYear();
          return (
            <div key={i} className="min-h-0 overflow-hidden border-r border-b p-1.5 [&:nth-child(7n)]:border-r-0">
              {valid && (
                <>
                  <span className={"num text-xs " + (isToday ? "rounded-full border px-1.5" : "text-muted-foreground")}>{d}</span>
                  <div className="mt-0.5 space-y-0.5">
                    {items.map((b) => (
                      <div key={b.id} className="truncate rounded border px-1 text-[11px]" title={b.title}>
                        <span className="num text-muted-foreground">{b.time}</span> {b.title}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="heading">Add event</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <div className="flex gap-2">
              <Input type="date" className="num" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              <Input type="time" className="num" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button
              disabled={!form.title || !form.date}
              onClick={async () => {
                await addBooking(form);
                setOpen(false);
                setForm({ title: "", date: "", time: "10:00" });
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Panel>
  );
}
