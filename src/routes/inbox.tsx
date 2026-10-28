import { createFileRoute, type ErrorComponentProps } from "@tanstack/react-router";
import { Bot, Flag, Instagram, MessageCircle, Search, Send, Smartphone, User } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useData } from "@/hooks/use-data";
import {
  flagConversation,
  getConversations,
  getMessages,
  markRead,
  sendOwnerMessage,
  sendSimulatedCustomerMessage,
  unflagConversation,
  type Conversation,
} from "@/lib/data";
import { Dot, PageTitle, Panel, Pill } from "@/components/skapter/ui";
import { Avatar, Ring } from "@/components/skapter/visuals";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/inbox")({
  head: () => ({
    meta: [
      { title: "Inbox · Skapter" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "description", content: "All WhatsApp and Instagram DMs for SudBudd MD in one place." },
      { property: "og:title", content: "Inbox · Skapter" },
      { property: "og:description", content: "All WhatsApp and Instagram DMs for SudBudd MD in one place." },
    ],
  }),
  component: InboxPage,
  errorComponent: ({ error }: ErrorComponentProps) => <section className="h-full overflow-auto p-6"><h1 className="heading">InboxPage</h1><p className="my-3 text-danger">{error.message}</p><pre className="num whitespace-pre-wrap break-all text-xs">{error.stack}</pre></section>,
});

const filters = ["Spam", "Inquiry", "Customers", "Flagged", "Unread", "Unread agent responses"] as const;
type Filter = (typeof filters)[number];
const match = (c: Conversation, f: Filter) =>
  f === "Spam" ? c.category === "Spam"
  : f === "Inquiry" ? c.category === "Inquiry"
  : f === "Customers" ? c.category === "Customer"
  : f === "Flagged" ? c.flagged
  : f === "Unread" ? c.unread
  : c.unreadAgent;

const ago = (t: number, now: number) => {
  const h = (now - t) / 3600_000;
  return h < 1 ? `${Math.max(1, Math.round(h * 60))}m` : h < 24 ? `${Math.round(h)}h` : `${Math.round(h / 24)}d`;
};

const ES_MSG = "Hola, ¿pueden hacer un detallado completo el jueves en el 48236?";

function InboxPage() {
  const convs = useData(getConversations, ["conversations", "messages"]) ?? [];
  const [q, setQ] = useState("");
  const [active, setActive] = useState<Filter[]>([]);
  const [sort, setSort] = useState<"new" | "old">("new");
  const [selected, setSelected] = useState<string>("c1");
  const [simOpen, setSimOpen] = useState(false);
  const [now, setNow] = useState(0);
  useEffect(() => { setNow(Date.now()); }, []);

  const list = useMemo(
    () =>
      convs
        .filter((c) => (q ? (c.name + c.preview).toLowerCase().includes(q.toLowerCase()) : true))
        .filter((c) => active.every((f) => match(c, f)))
        .sort((a, b) => (sort === "new" ? b.lastAt - a.lastAt : a.lastAt - b.lastAt)),
    [convs, q, active, sort],
  );
  const current = convs.find((c) => c.id === selected);

  return (
    <div className="flex h-full min-h-[520px] flex-col">
      <PageTitle
        sub={
          <Button variant="outline" size="sm" onClick={() => setSimOpen((o) => !o)}>
            <Smartphone className="size-3.5" /> Customer Simulator
          </Button>
        }
      >
        Inbox
      </PageTitle>
      <div className={cn("grid min-h-0 flex-1 gap-3 overflow-x-auto", simOpen ? "grid-cols-[250px_minmax(320px,1fr)_240px_280px]" : "grid-cols-[250px_minmax(320px,1fr)_240px]")}>
        <Panel bodyClassName="flex flex-col gap-3 px-0">
          <div className="space-y-3 px-4">
            <div className="relative">
              <Search className="absolute top-2.5 left-2.5 size-4 text-muted-foreground" />
              <Input className="pl-8" placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {filters.map((f) => (
                <Button variant="ghost" size="sm"
                  key={f}
                  className={cn("pill h-auto", active.includes(f) ? "border-foreground text-foreground" : "text-muted-foreground hover:text-foreground")}
                  onClick={() => setActive((a) => (a.includes(f) ? a.filter((x) => x !== f) : [...a, f]))}
                >
                  {f}
                </Button>
              ))}
            </div>
            <div className="flex gap-1.5 text-xs">
              {(["new", "old"] as const).map((s) => (
                <Button variant="ghost" size="sm" key={s} className={cn("pill h-auto", sort === s ? "border-foreground" : "text-muted-foreground")} onClick={() => setSort(s)}>
                  {s === "new" ? "Newest" : "Oldest"}
                </Button>
              ))}
            </div>
          </div>
          <ul className="min-h-0 flex-1 divide-y overflow-y-auto border-t">
            {list.map((c) => (
              <li key={c.id}>
                <Button variant="ghost"
                  aria-label={`Open ${c.name}`}
                  className={cn("h-auto w-full justify-start rounded-none whitespace-normal px-3 py-3 text-left hover:bg-accent/60", selected === c.id && "nav-active")}
                  onClick={() => { setSelected(c.id); markRead(c.id); }}
                >
                  <Avatar name={c.name} className={c.channel === "Instagram" ? "border-warning/20 bg-warning/10 text-warning" : ""} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5"><span className="truncate text-xs font-medium">{c.name}</span>{c.flagged && <Flag className="size-3 shrink-0 text-danger" />}{(c.unread || c.unreadAgent) && <Dot tone={c.unread ? "green" : "amber"} />}</div>
                    <p className="mt-1 truncate text-[11px] font-normal text-muted-foreground">{c.preview}</p>
                    <div className="mt-1.5 flex items-center gap-2 text-muted-foreground"><span title={c.channel}>{c.channel === "Instagram" ? <Instagram className="size-3" /> : c.channel === "Simulated" ? <Smartphone className="size-3" /> : <MessageCircle className="size-3" />}</span><span title={c.category}><Dot tone={c.category === "Spam" ? "muted" : c.category === "Inquiry" ? "amber" : "green"} /></span><span className="num ml-auto text-[10px]">{now ? ago(c.lastAt, now) : "—"}</span></div>
                  </div>
                </Button>
              </li>
            ))}
            {list.length === 0 && <li className="px-4 py-6 text-sm text-muted-foreground">No conversations.</li>}
          </ul>
        </Panel>
        {current ? <Thread conv={current} /> : <Panel><p className="text-sm text-muted-foreground">Select a conversation.</p></Panel>}
        {current && <Profile conv={current} />}
        {simOpen && <Simulator onSent={setSelected} />}
      </div>
    </div>
  );
}

function Thread({ conv }: { conv: Conversation }) {
  const msgs = useData(() => getMessages(conv.id), ["messages"], [conv.id]) ?? [];
  const [text, setText] = useState("");
  const [flagOpen, setFlagOpen] = useState(false);
  const [note, setNote] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ block: "nearest" }); }, [msgs.length, conv.id]);

  return (
    <Panel
      title={<span className="flex items-center gap-2"><Avatar name={conv.name} className="size-8" /><span>{conv.name}<span className="mt-1 block text-[10px] font-normal text-muted-foreground">{conv.channel}</span></span></span>}
      action={
        conv.flagged ? (
          <Button variant="outline" size="sm" onClick={() => unflagConversation(conv.id)}>
            <Flag className="size-3.5 text-danger" /> Unflag
          </Button>
        ) : (
          <Button variant="outline" size="sm" onClick={() => setFlagOpen(true)}>
            <Flag className="size-3.5" /> Flag
          </Button>
        )
      }
      bodyClassName="flex flex-col gap-3"
    >
      {conv.flagged && conv.flagNote && <p className="text-xs text-muted-foreground">Flag note: {conv.flagNote}</p>}
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
        {msgs.map((m) => (
          <div key={m.id} className={cn("flex flex-col", m.sender === "customer" ? "items-start" : "items-end")}>
            <span className="mb-1 text-[11px] text-muted-foreground">
              {m.sender === "customer" ? conv.name : m.sender === "agent" ? "Agent" : "You"} ·{" "}
              <span className="num">{new Date(m.at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</span>
            </span>
            <div
              className={cn(
                "max-w-[75%] rounded-lg px-3 py-2 text-sm",
                m.sender === "customer" && "border bg-card",
                m.sender === "agent" && "border border-primary/30 bg-primary/5",
                m.sender === "owner" && "bg-primary text-primary-foreground",
              )}
            >
              {m.sender === "agent" && <span className="mb-1 flex items-center gap-1 text-[10px] text-primary"><Bot className="size-3" />AI</span>}
              {m.text}
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <form className="flex gap-2" onSubmit={async (e) => { e.preventDefault(); if (!text.trim()) return; await sendOwnerMessage(conv.id, text.trim()); setText(""); }}>
        <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Reply as owner…" />
        <Button type="submit" size="icon" aria-label="Send"><Send className="size-4" /></Button>
      </form>
      <Dialog open={flagOpen} onOpenChange={setFlagOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle className="heading">Flag conversation</DialogTitle></DialogHeader>
          <Textarea placeholder="Short note" value={note} onChange={(e) => setNote(e.target.value)} />
          <DialogFooter>
            <Button onClick={async () => { await flagConversation(conv.id, note); setNote(""); setFlagOpen(false); }}>Flag</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Panel>
  );
}

function Profile({ conv }: { conv: Conversation }) {
  return (
    <Panel title={<span className="flex items-center gap-2"><User className="size-4" />Customer Profile</span>}>
      <div className="mb-4 flex items-center gap-3"><Avatar name={conv.name} className="size-12" /><div><p className="text-sm">{conv.name}</p><Pill tone={conv.category === "Customer" ? "green" : "amber"}>{conv.category}</Pill></div>{conv.id === "c1" && <div className="ml-auto w-12"><Ring value={22 / 24 * 100} danger label="Mark Vance waiting 22 hours"><span className="num text-xs text-danger">22h</span></Ring></div>}</div>
      <dl className="divide-y text-sm">
        <div className="py-2"><dt className="text-xs text-muted-foreground">Name</dt><dd>{conv.name}</dd></div>
        <div className="py-2"><dt className="text-xs text-muted-foreground">Address</dt><dd className="num">{conv.address ?? "—"}</dd></div>
        <div className="py-2"><dt className="text-xs text-muted-foreground">Preferred contact</dt><dd>{conv.preferredContact}</dd></div>
      </dl>
      <h3 className="heading mt-4 mb-1 text-sm">Purchase history</h3>
      <ul className="divide-y text-sm">
        {conv.purchases.length === 0 && <li className="py-2 text-muted-foreground">No purchases yet.</li>}
        {conv.purchases.map((p, i) => (
          <li key={i} className="flex justify-between py-2">
            <span>{p.service}<span className="num block text-xs text-muted-foreground">{p.date}</span></span>
            <span className="num">${p.price}</span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

function Simulator({ onSent }: { onSent: (id: string) => void }) {
  const [lang, setLang] = useState<"EN" | "ES">("EN");
  const [text, setText] = useState("");
  const send = async (t: string) => {
    if (!t.trim()) return;
    const id = await sendSimulatedCustomerMessage(t.trim());
    setText("");
    onSent(id);
  };
  return (
    <Panel title="Customer Simulator" action={<Pill tone="amber">Simulated</Pill>} bodyClassName="flex">
      <div className="mx-auto flex w-full flex-1 flex-col rounded-[2rem] border-4 p-3">
        <div className="mx-auto mb-3 h-1.5 w-16 rounded-full bg-muted" />
        <div className="mb-3 flex justify-center gap-1">
          {(["EN", "ES"] as const).map((l) => (
            <Button variant="ghost" size="sm" key={l} className={cn("pill h-auto", lang === l ? "border-foreground" : "text-muted-foreground")} onClick={() => setLang(l)}>{l}</Button>
          ))}
        </div>
        <div className="flex-1" />
        {lang === "ES" ? (
          <Button variant="outline" className="h-auto whitespace-normal text-left text-xs" onClick={() => send(ES_MSG)}>
            Send: “{ES_MSG}”
          </Button>
        ) : (
          <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); send(text); }}>
            <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Type as customer…" />
            <Button type="submit" size="sm">Send</Button>
          </form>
        )}
      </div>
    </Panel>
  );
}
