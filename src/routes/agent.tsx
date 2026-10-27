import { createFileRoute } from "@tanstack/react-router";
import { Mic, MicOff, Send } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useData } from "@/hooks/use-data";
import { askAgent, getErrors, getExecutionLog, getRules, saveRule, toggleRule } from "@/lib/data";
import { Dot, PageTitle, Panel, Pill, fmtTime } from "@/components/skapter/ui";

export const Route = createFileRoute("/agent")({
  head: () => ({
    meta: [
      { title: "Agent · Skapter" },
      { name: "description", content: "Chat with, configure and audit the Skapter operations agent." },
      { property: "og:title", content: "Agent · Skapter" },
      { property: "og:description", content: "Chat with, configure and audit the Skapter operations agent." },
    ],
  }),
  component: AgentPage,
});

function AgentPage() {
  return (
    <div className="flex h-full flex-col">
      <PageTitle>Agent</PageTitle>
      <Tabs defaultValue="chat" className="flex min-h-0 flex-1 flex-col">
        <TabsList className="w-fit">
          <TabsTrigger value="chat">Chat</TabsTrigger>
          <TabsTrigger value="rules">Rules</TabsTrigger>
          <TabsTrigger value="log">Execution Log</TabsTrigger>
          <TabsTrigger value="errors">Errors</TabsTrigger>
        </TabsList>
        <TabsContent value="chat" className="min-h-0 flex-1"><ChatTab /></TabsContent>
        <TabsContent value="rules" className="min-h-0 flex-1"><RulesTab /></TabsContent>
        <TabsContent value="log" className="min-h-0 flex-1"><LogTab /></TabsContent>
        <TabsContent value="errors" className="min-h-0 flex-1"><ErrorsTab /></TabsContent>
      </Tabs>
    </div>
  );
}

const examples = [
  "What's booked for Thursday?",
  "Draft a reply to Mark Vance",
  "Which supplies should I reorder?",
  "Summarize unread messages",
];

type SpeechRec = {
  lang: string;
  interimResults: boolean;
  onresult: (e: { results: { 0: { transcript: string } }[] }) => void;
  onend: () => void;
  start: () => void;
  stop: () => void;
};

function ChatTab() {
  const [msgs, setMsgs] = useState<{ role: "you" | "agent"; text: string }[]>([]);
  const [text, setText] = useState("");
  const [listening, setListening] = useState(false);
  const recRef = useRef<SpeechRec | null>(null);

  const send = async (t: string) => {
    if (!t.trim()) return;
    setMsgs((m) => [...m, { role: "you", text: t }]);
    setText("");
    const reply = await askAgent(t);
    setMsgs((m) => [...m, { role: "agent", text: reply }]);
  };

  const toggleMic = () => {
    if (listening) return recRef.current?.stop();
    const Ctor = (window as unknown as { webkitSpeechRecognition?: new () => SpeechRec }).webkitSpeechRecognition;
    if (!Ctor) return alert("Voice input isn't supported in this browser.");
    const rec = new Ctor();
    rec.lang = "en-US";
    rec.interimResults = false;
    rec.onresult = (e) => setText(Array.from(e.results).map((r) => r[0].transcript).join(" "));
    rec.onend = () => setListening(false);
    recRef.current = rec;
    rec.start();
    setListening(true);
  };

  return (
    <Panel className="h-full" bodyClassName="flex flex-col gap-4">
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto">
        {msgs.length === 0 && <p className="text-sm text-muted-foreground">Ask the agent anything about your business.</p>}
        {msgs.map((m, i) => (
          <div key={i} className={m.role === "you" ? "ml-auto max-w-[70%] rounded-lg border bg-accent px-3 py-2 text-sm" : "max-w-[70%] rounded-lg border px-3 py-2 text-sm"}>
            {m.text}
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {examples.map((e) => (
          <button key={e} className="pill hover:bg-accent" onClick={() => send(e)}>{e}</button>
        ))}
      </div>
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); send(text); }}>
        <Button type="button" variant={listening ? "secondary" : "outline"} size="icon" onClick={toggleMic} aria-label="Voice input">
          {listening ? <MicOff className="size-4" /> : <Mic className="size-4" />}
        </Button>
        <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Message the agent…" />
        <Button type="submit" size="icon" aria-label="Send"><Send className="size-4" /></Button>
      </form>
    </Panel>
  );
}

function RulesTab() {
  const rules = useData(getRules, ["rules"]);
  const [draft, setDraft] = useState("");
  return (
    <div className="grid h-full grid-cols-[1fr_1.5fr] gap-4">
      <Panel title="New rule">
        <Textarea rows={6} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Describe a rule in plain language…" />
        <Button className="mt-3" disabled={!draft.trim()} onClick={async () => { await saveRule(draft.trim()); setDraft(""); }}>
          Save
        </Button>
      </Panel>
      <Panel title="Rules">
        <ul className="divide-y">
          {rules?.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-4 py-3 text-sm">
              <span className={r.enabled ? "" : "text-muted-foreground"}>{r.text}</span>
              <Switch checked={r.enabled} onCheckedChange={() => toggleRule(r.id)} />
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}

function LogTab() {
  const log = useData(getExecutionLog, ["log"]);
  return (
    <Panel className="h-full">
      <div className="num divide-y text-xs">
        <div className="grid grid-cols-[90px_160px_60px_1fr_140px] py-2 text-muted-foreground">
          <span>time</span><span>action</span><span>status</span><span>detail</span><span>provider</span>
        </div>
        {log?.map((l) => (
          <div key={l.id} className="grid grid-cols-[90px_160px_60px_1fr_140px] items-center py-2">
            <span className="text-muted-foreground">{fmtTime(l.at)}</span>
            <span>{l.action}</span>
            <span className="flex items-center gap-1.5"><Dot tone={l.status === "ok" ? "green" : "red"} />{l.status}</span>
            <span className="truncate">{l.detail}</span>
            <span className="text-muted-foreground">{l.provider}</span>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function ErrorsTab() {
  const errors = useData(getErrors, ["log"]);
  return (
    <Panel className="h-full">
      <ul className="divide-y text-sm">
        {errors?.length === 0 && <li className="py-3 text-muted-foreground">No errors.</li>}
        {errors?.map((e) => (
          <li key={e.id} className="flex items-center justify-between gap-4 py-3">
            <div>
              <div className="flex items-center gap-2">
                <Dot tone="red" />
                <span className="num">{e.action}</span>
                <span className="text-muted-foreground">· {e.detail}</span>
              </div>
              <p className="mt-1 pl-4 text-muted-foreground">{e.reason}</p>
            </div>
            <span className="flex items-center gap-2">
              <Pill>{e.provider}</Pill>
              <span className="num text-xs text-muted-foreground">{fmtTime(e.at)}</span>
            </span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
