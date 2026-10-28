import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type Tone = "green" | "amber" | "red" | "muted";
const toneClass: Record<Tone, string> = {
  green: "bg-success",
  amber: "bg-warning",
  red: "bg-danger",
  muted: "bg-muted-foreground",
};

export function Dot({ tone, className }: { tone: Tone; className?: string }) {
  return <span className={cn("inline-block size-2 shrink-0 rounded-full", toneClass[tone], tone === "green" && "live-dot", className)} />;
}

export function Pill({ children, tone, className }: { children: ReactNode; tone?: Tone; className?: string }) {
  return (
    <span className={cn("pill text-muted-foreground", className)}>
      {tone && <Dot tone={tone} />}
      {children}
    </span>
  );
}

export function Panel({
  title,
  action,
  children,
  className,
  bodyClassName,
}: {
  title?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cn("panel flex flex-col overflow-hidden", className)}>
      {title && (
        <header className="flex items-center justify-between gap-2 px-4 pt-4 pb-3">
          <h2 className="heading text-sm">{title}</h2>
          {action}
        </header>
      )}
      <div className={cn("min-h-0 flex-1 overflow-y-auto px-4 pb-4", !title && "pt-4", bodyClassName)}>{children}</div>
    </section>
  );
}

export function PageTitle({ children, sub }: { children: ReactNode; sub?: ReactNode }) {
  return (
    <div className="mb-4 flex items-end justify-between">
      <h1 className="heading text-2xl">{children}</h1>
      {sub}
    </div>
  );
}

export const fmtTime = (t: number) =>
  new Date(t).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
export const fmtMoney = (n: number) => `$${n.toFixed(2)}`;
