import { Component, useEffect, useState, type ErrorInfo, type ReactNode } from "react";
import { Activity, Bot, CalendarCheck, CreditCard, MessageSquare, PackageCheck, ScanLine, Send, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export class PageBoundary extends Component<{ children: ReactNode; name: string }, { error: Error | null; componentStack: string }> {
  override state = { error: null as Error | null, componentStack: "" };
  static getDerivedStateFromError(error: Error) { return { error }; }
  override componentDidCatch(_error: Error, info: ErrorInfo) { this.setState({ componentStack: info.componentStack ?? "" }); }
  override render() {
    if (!this.state.error) return this.props.children;
    return <section className="h-full overflow-auto rounded-lg border border-danger/40 p-6"><h1 className="heading text-lg">{this.props.name}</h1><p className="my-3 text-danger">{this.state.error.message}</p><pre className="num whitespace-pre-wrap break-all text-xs text-muted-foreground">{this.state.error.stack}{this.state.componentStack}</pre><Button className="mt-4" onClick={() => this.setState({ error: null, componentStack: "" })}>Try again</Button></section>;
  }
}

export function CountUp({ value, suffix = "", prefix = "" }: { value: number; suffix?: string | undefined; prefix?: string | undefined }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setShown(value); return; }
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => { const p = Math.min(1, (now - start) / 900); setShown(Math.round(value * (1 - (1 - p) ** 3))); if (p < 1) frame = requestAnimationFrame(tick); };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);
  return <span className="num">{prefix}{shown}{suffix}</span>;
}

export function Ring({ value, label, children, danger = false }: { value: number; label?: string; children?: ReactNode; danger?: boolean }) {
  return <div className="relative grid aspect-square place-items-center" aria-label={label}>
    <svg viewBox="0 0 100 100" className="absolute inset-0 size-full -rotate-90" aria-hidden="true"><circle cx="50" cy="50" r="43" fill="none" stroke="var(--border)" strokeWidth="5" /><circle cx="50" cy="50" r="43" fill="none" stroke={danger ? "var(--danger)" : "var(--primary)"} strokeWidth="5" strokeLinecap="round" strokeDasharray={`${Math.min(100, Math.max(0, value)) * 2.702} 270.2`} className="gauge-stroke" /></svg>
    <div className="relative text-center">{children}</div>
  </div>;
}

export function Avatar({ name, className }: { name: string; className?: string }) {
  return <span className={cn("avatar grid size-10 shrink-0 place-items-center rounded-full border border-primary/20 bg-primary/10 text-xs font-medium text-primary", className)}>{name.split(" ").slice(0, 2).map(s => s[0]).join("")}</span>;
}

export const toolIcons: Record<string, typeof Activity> = { reserve_stock: PackageCheck, create_booking: CalendarCheck, reply_customer: MessageSquare, classify_message: ScanLine, send_quote: Tag, update_inventory: PackageCheck };
export const pipelineSteps = [{ label: "Message", icon: MessageSquare }, { label: "Intent", icon: Bot }, { label: "Stock held", icon: PackageCheck }, { label: "Checkout", icon: CreditCard }, { label: "Booked", icon: CalendarCheck }];

export function CarShape({ size = "Medium", className }: { size?: "Small" | "Medium" | "Large"; className?: string }) {
  const roof = size === "Small" ? "M30 38 L40 23 H66 L78 38" : size === "Large" ? "M24 38 L32 17 H78 L85 38" : "M25 38 L40 24 H68 L85 38";
  return <svg viewBox="0 0 112 64" className={cn("w-24 text-primary", className)} aria-hidden="true"><path d={`${roof} L103 42 V52 H10 V42 Z`} fill="var(--primary)" fillOpacity=".12" stroke="currentColor" strokeWidth="2" /><path d="M44 27 H65 L74 37 H37 Z" fill="var(--primary)" fillOpacity=".25" /><circle cx="30" cy="51" r="8" fill="var(--background)" stroke="currentColor" strokeWidth="2" /><circle cx="85" cy="51" r="8" fill="var(--background)" stroke="currentColor" strokeWidth="2" /></svg>;
}