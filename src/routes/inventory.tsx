import { createFileRoute } from "@tanstack/react-router";
import { useData } from "@/hooks/use-data";
import { getInventory, stockPercent, stockStatus, type StockStatus } from "@/lib/data";
import { PageTitle, Panel, Pill, fmtMoney, type Tone } from "@/components/skapter/ui";

export const Route = createFileRoute("/inventory")({
  head: () => ({
    meta: [
      { title: "Inventory · Skapter" },
      { name: "description", content: "Supply levels and an automatic shopping list for SudBudd MD." },
      { property: "og:title", content: "Inventory · Skapter" },
      { property: "og:description", content: "Supply levels and an automatic shopping list for SudBudd MD." },
    ],
  }),
  component: InventoryPage,
});

const tone: Record<StockStatus, Tone> = { Great: "green", Good: "green", Fine: "amber", Low: "amber", Critical: "red" };

function InventoryPage() {
  const items = (useData(getInventory, ["inventory"]) ?? []).map((i) => {
    const pct = stockPercent(i);
    return { ...i, pct, status: stockStatus(pct) };
  });
  const shopping = items.filter((i) => i.status === "Low" || i.status === "Critical").sort((a, b) => a.pct - b.pct);
  const recommended = items.filter((i) => i.status === "Fine");

  return (
    <div className="flex h-full flex-col">
      <PageTitle>Inventory</PageTitle>
      <div className="grid min-h-0 flex-1 grid-rows-[3fr_2fr] gap-4">
        <Panel title="Stock">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground">
              <tr className="border-b">
                <th className="py-2 font-normal">Item</th>
                <th className="py-2 text-right font-normal">Price</th>
                <th className="py-2 text-right font-normal">Total Stock</th>
                <th className="py-2 pl-8 font-normal">Stock %</th>
                <th className="py-2 font-normal">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map((i) => (
                <tr key={i.id}>
                  <td className="py-2.5">{i.name}</td>
                  <td className="num py-2.5 text-right">{fmtMoney(i.price)}</td>
                  <td className="num py-2.5 text-right">{i.stock}/{i.capacity}</td>
                  <td className="py-2.5 pl-8">
                    <div className="flex items-center gap-3">
                      <div className="h-1 w-32 overflow-hidden rounded-full bg-muted">
                        <div className="h-full bg-foreground/70" style={{ width: `${i.pct}%` }} />
                      </div>
                      <span className="num text-xs text-muted-foreground">{i.pct}%</span>
                    </div>
                  </td>
                  <td className="py-2.5"><Pill tone={tone[i.status]}>{i.status}</Pill></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
        <Panel title="Shopping List" action={<Pill>Auto-generated</Pill>}>
          <ul className="divide-y text-sm">
            {[...shopping, ...recommended].map((i) => (
              <li key={i.id} className="flex items-center justify-between py-2.5">
                <span className="flex items-center gap-3">
                  {i.name}
                  {i.status === "Fine" && <Pill>recommended</Pill>}
                </span>
                <span className="flex items-center gap-4">
                  <span className="num text-xs text-muted-foreground">
                    need {i.capacity - i.stock} · {fmtMoney((i.capacity - i.stock) * i.price)}
                  </span>
                  <Pill tone={tone[i.status]}>{i.status}</Pill>
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}
