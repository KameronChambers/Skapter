import { createFileRoute } from "@tanstack/react-router";
import { FlaskConical, LayoutGrid, List, Package, ShoppingBag } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useData } from "@/hooks/use-data";
import { deductRecipe, getInventory, getShoppingList, recipeFor, SERVICES, stockPercent, stockStatus, type InventoryItem, type StockStatus, type VehicleSize } from "@/lib/data";
import { Dot, PageTitle, Panel, Pill, fmtMoney, type Tone } from "@/components/skapter/ui";
import { CarShape } from "@/components/skapter/visuals";

export const Route = createFileRoute("/inventory")({ head: () => ({ meta: [
  { title: "Inventory · Skapter" }, { name: "description", content: "Supply gauges, service recipes and shopping for SudBudd MD." },
  { property: "og:title", content: "Inventory · Skapter" }, { property: "og:description", content: "Supply gauges, service recipes and shopping for SudBudd MD." },
  { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
] }), component: InventoryPage });
const tones: Record<StockStatus, Tone> = { Great: "green", Good: "green", Fine: "amber", Low: "amber", Critical: "red" };
const colors: Record<StockStatus, string> = { Great: "var(--success)", Good: "var(--success)", Fine: "var(--warning)", Low: "var(--stock-low)", Critical: "var(--danger)" };
function InventoryPage() {
  const items = useData(getInventory, ["inventory"]) ?? [];
  const shopping = useData(getShoppingList, ["inventory"]) ?? [];
  const [view, setView] = useState<"grid" | "list">("grid");
  const [size, setSize] = useState<VehicleSize>("Medium");
  const [service, setService] = useState("Premium Detail");
  const [result, setResult] = useState("");
  const usage = recipeFor(service, size);
  const amounts = Object.fromEntries(usage.map(u => [u.id, u.amount]));
  const recipeItems = usage.map(u => items.find(i => i.id === u.id)).filter((i): i is InventoryItem => !!i);
  return <div className="flex min-h-full flex-col"><PageTitle sub={<Pill>{items.length} supplies</Pill>}>Inventory</PageTitle><Tabs defaultValue="stock" className="flex flex-1 flex-col"><div className="mb-3 flex justify-between"><TabsList><TabsTrigger value="stock"><Package className="mr-2 size-3" />Stock</TabsTrigger><TabsTrigger value="recipes"><FlaskConical className="mr-2 size-3" />Recipes</TabsTrigger></TabsList><div className="flex gap-1"><Button variant={view === "grid" ? "secondary" : "ghost"} size="icon" aria-label="Grid view" onClick={() => setView("grid")}><LayoutGrid /></Button><Button variant={view === "list" ? "secondary" : "ghost"} size="icon" aria-label="List view" onClick={() => setView("list")}><List /></Button></div></div>
    <TabsContent value="stock" className="space-y-4"><Stock items={items} view={view} /><Panel title={<span className="flex items-center gap-2"><ShoppingBag className="size-4" />Shopping list</span>} action={<Pill>Auto-generated</Pill>}><ul className="divide-y">{shopping.length === 0 && <li className="py-3 text-xs text-muted-foreground">Nothing to buy.</li>}{shopping.map(i => { const status = stockStatus(stockPercent(i)); return <li key={i.id} className="flex flex-wrap items-center gap-2 py-3 text-xs"><FlaskConical className="size-4 text-muted-foreground" /><span>{i.name}</span><span className="text-muted-foreground">({i.packLabel})</span>{i.reason && <span className="w-full pl-6 text-[11px] text-warning">Agent: {i.reason}</span>}<span className="num ml-auto text-muted-foreground">{i.packs} × · {fmtMoney(i.packs * i.price)}</span><Pill tone={tones[status]}>{status}</Pill></li>; })}</ul></Panel></TabsContent>
    <TabsContent value="recipes" className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <Panel title="Service">
          <div className="grid gap-1">{SERVICES.map(s => <Button key={s} size="sm" variant={service === s ? "default" : "ghost"} className="justify-start" onClick={() => { setService(s); setResult(""); }}>{s}</Button>)}</div>
        </Panel>
        <Panel title="Usage per job" action={<Button size="sm" onClick={async () => { const r = await deductRecipe(service, size); setResult(r.ok ? `Deducted supplies for ${service} (${size}).` : r.explanation); }}>Book job · deduct</Button>}>
          <div className="mb-4 flex gap-2">{(["Small", "Medium", "Large"] as const).map(s => <Button key={s} variant={s === size ? "secondary" : "ghost"} className="h-auto flex-col px-3 py-2" onClick={() => setSize(s)}><CarShape size={s} className="w-16" /><span className="text-xs">{s}</span></Button>)}</div>
          <table className="w-full text-xs"><thead className="text-left text-muted-foreground"><tr className="border-b"><th className="pb-2">Supply</th><th>Uses</th><th>In stock</th><th>After job</th></tr></thead><tbody className="divide-y">{recipeItems.map(i => { const after = i.stock - amounts[i.id]; return <tr key={i.id}><td className="py-2">{i.name}</td><td className="num text-primary">{amounts[i.id]} {i.unit}</td><td className="num">{i.stock} {i.unit}</td><td className={"num " + (after < 0 ? "text-danger" : "")}>{after < 0 ? "Short" : `${Math.round(after * 100) / 100} ${i.unit}`}</td></tr>; })}</tbody></table>
          {result && <p role="status" className="mt-3 rounded-md border px-3 py-2 text-xs">{result}</p>}
        </Panel>
      </div>
    </TabsContent>
  </Tabs></div>;
}
function Stock({ items, view }: { items: InventoryItem[]; view: "grid" | "list" }) {
  if (view === "list") return <Panel><div className="overflow-x-auto"><table className="w-full min-w-[520px] text-xs"><thead className="text-left text-muted-foreground"><tr className="border-b"><th className="pb-3">Supply</th><th>Pack size</th><th>Price</th><th>In stock</th><th>Stock %</th><th>Status</th></tr></thead><tbody className="divide-y">{items.map(i=><tr key={i.id}><td className="py-3">{i.name}</td><td className="text-muted-foreground">{i.packLabel}</td><td className="num">{i.price ? fmtMoney(i.price) : "—"}</td><td className="num">{i.stock} / {i.capacity} {i.unit}</td><td className="num">{stockPercent(i)}%</td><td><Pill tone={tones[stockStatus(stockPercent(i))]}>{stockStatus(stockPercent(i))}</Pill></td></tr>)}</tbody></table></div></Panel>;
  return <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-7">{items.map(i => { const pct = stockPercent(i); const status = stockStatus(pct); return <section key={i.id} className="panel stat-tile p-3"><div className="flex items-start justify-between gap-2"><h2 className="text-xs font-medium leading-tight">{i.name}</h2><Dot tone={tones[status]} /></div><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full" style={{ width: `${Math.min(100, pct)}%`, background: colors[status] }} /></div><div className="num mt-2 text-lg">{i.stock}<span className="text-xs text-muted-foreground"> {i.unit}</span></div><div className="mt-1 flex justify-between text-[10px] text-muted-foreground"><span>{i.packLabel}</span><span className="num">{pct}%</span></div></section>; })}</div>;
}
