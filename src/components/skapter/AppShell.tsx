import { Link, useRouterState } from "@tanstack/react-router";
import { Activity, Bot, Home, Inbox, Moon, Package, RotateCcw, Sun } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { getSettings, resetDemo, setModelStatus } from "@/lib/data";
import { useData } from "@/hooks/use-data";
import { Dot } from "./ui";
import { toast } from "sonner";

const nav = [
  { to: "/", label: "Home", icon: Home },
  { to: "/inbox", label: "Inbox", icon: Inbox },
  { to: "/agent", label: "Agent", icon: Bot },
  { to: "/inventory", label: "Inventory", icon: Package },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const settings = useData(getSettings, ["settings"]);
  const [dark, setDark] = useState(true);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);
  const live = settings?.modelStatus !== "fallback";

  return (
    <div className="flex h-screen overflow-hidden bg-background grid-canvas">
      <aside className="flex w-16 md:w-48 shrink-0 flex-col border-r bg-sidebar/80 backdrop-blur">
        <div className="flex h-14 items-center gap-2 border-b px-3 md:px-5">
          <span className="grid size-6 place-items-center rounded-md accent-fill heading text-xs">S</span>
          <span className="heading hidden text-lg md:inline">Skapter</span>
        </div>
        <nav className="flex flex-col gap-1 p-3">
          {nav.map(({ to, label, icon: Icon }) => {
            const active = to === "/" ? path === "/" : path.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                className={
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors " +
                  (active ? "border nav-active" : "border border-transparent text-muted-foreground hover:text-foreground")
                }
              >
                <Icon className="size-4" />
                <span className="hidden md:inline">{label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto hidden items-center gap-2 border-t p-4 text-xs text-muted-foreground md:flex"><Activity className="size-4 text-primary" /> Operations online</div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between border-b bg-background/70 px-3 md:px-6 backdrop-blur">
          <span className="heading">{settings?.businessName ?? "SudBudd MD"}</span>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm"
              className="hidden sm:inline-flex pill hover:bg-accent"
              title="Click to switch model status"
              onClick={() => setModelStatus(live ? "fallback" : "live")}
            >
              <Dot tone={live ? "green" : "amber"} />
              Model: {live ? "live" : "fallback"}
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setDark((d) => !d)} aria-label="Toggle theme">
              {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                await resetDemo();
                toast("Demo data reset");
              }}
            >
              <RotateCcw className="size-3.5" /> <span className="hidden sm:inline">Reset Demo</span>
            </Button>
          </div>
        </header>
        <main className="min-h-0 flex-1 overflow-auto p-3 md:p-5">{children}</main>
      </div>
    </div>
  );
}
