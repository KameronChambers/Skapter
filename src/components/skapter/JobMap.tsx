import { useEffect, useRef, useState } from "react";
import type { Circle, LayerGroup, Map as LeafletMap, Marker } from "leaflet";
import { useData } from "@/hooks/use-data";
import { getJobMapData, JOB_SERVICES, SERVICE_RADIUS_RANGE, setServiceRadiusMiles, type JobMapFilters, type JobService } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, RotateCcw } from "lucide-react";

type MapData = Awaited<ReturnType<typeof getJobMapData>>;
const serviceClasses: Record<JobService, string> = {
  "Full Detail": "job-full", Interior: "job-interior", "Exterior Wash": "job-exterior",
  "Supply run": "job-supply", "Ceramic Coat": "job-ceramic", Other: "job-other",
};
const credit = <><a href="https://openfreemap.org/" target="_blank" rel="noreferrer">OpenFreeMap</a> · <a href="https://www.openmaptiles.org/" target="_blank" rel="noreferrer">OpenMapTiles</a> · <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap contributors</a></>;

export function JobMap({ height, expanded = false }: { height?: string; expanded?: boolean } = {}) {
  const [filters, setFilters] = useState<JobMapFilters>({});
  const data = useData(() => getJobMapData(filters), ["bookings", "settings"], [filters]);
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMap | null>(null);
  const circle = useRef<Circle | null>(null);
  const markers = useRef(new Map<string, Marker>());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const pins = useRef<LayerGroup | null>(null);
  const leaflet = useRef<typeof import("leaflet") | null>(null);
  const previous = useRef<Set<string> | null>(null);
  const [ready, setReady] = useState(false);
  const [failure, setFailure] = useState("");
  const hasData = Boolean(data);

  useEffect(() => {
    if (!data || !container.current || failure) return;
    let cancelled = false;
    let observer: ResizeObserver | undefined;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    let resizeFrame: number | undefined;
    let instance: LeafletMap | undefined;
    const fail = () => { if (!cancelled) setFailure("Basemap unavailable"); };
    async function initialize() {
      try {
        const [L, gl, bridge, worker] = await Promise.all([
          import("leaflet"), import("maplibre-gl"), import("@maplibre/maplibre-gl-leaflet"),
          import("maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url"),
        ]);
        if (cancelled || !container.current || !data) return;
        gl.setWorkerUrl(worker.default);
        leaflet.current = L;
        instance = L.map(container.current, { attributionControl: false, scrollWheelZoom: true });
        map.current = instance;
        instance.fitBounds([[data.bounds.south, data.bounds.west], [data.bounds.north, data.bounds.east]], { padding: [12, 12] });
        const styles = getComputedStyle(container.current);
        circle.current = L.circle([data.settings.base.lat, data.settings.base.lng], {
          radius: data.settings.serviceRadiusMiles * 1609.344, color: styles.getPropertyValue("--primary").trim(),
          weight: 1, fillOpacity: 0.06, dashArray: "4 4",
        }).addTo(instance);
        L.marker([data.settings.base.lat, data.settings.base.lng], {
          icon: L.divIcon({ className: "job-base-icon", html: '<span class="job-base">⌂</span>', iconSize: [22, 22], iconAnchor: [11, 11] }),
          title: data.settings.businessName,
        }).bindTooltip(data.settings.businessName).addTo(instance);
        pins.current = L.layerGroup().addTo(instance);
        const tiles = bridge.maplibreGL({ style: "https://tiles.openfreemap.org/styles/dark" });
        // The adapter queues uncancellable resize frames that can outlive removal.
        // Replace that callback with a cancellable, guarded equivalent.
        const resizeLayer = tiles as typeof tiles & { _transitionEnd: () => void; _resizeContainer: () => void; _zoomEnd: () => void };
        resizeLayer._transitionEnd = () => {
          if (resizeFrame !== undefined) cancelAnimationFrame(resizeFrame);
          resizeFrame = requestAnimationFrame(() => {
            if (cancelled || !instance) return;
            try {
              resizeLayer._resizeContainer();
              const glMap = tiles.getMaplibreMap();
              const offset = instance.latLngToContainerPoint(instance.getBounds().getNorthWest());
              L.DomUtil.setTransform(tiles.getCanvas(), offset, 1);
              glMap.once("moveend", () => { if (!cancelled) resizeLayer._zoomEnd(); });
              glMap.jumpTo({ center: instance.getCenter(), zoom: instance.getZoom() - 1 });
            } catch { fail(); }
          });
        };
        tiles.on("tileerror", fail);
        tiles.addTo(instance);
        const basemap = tiles.getMaplibreMap();
        basemap.on("error", fail);
        timeout = setTimeout(fail, 20000);
        basemap.on("load", () => { if (timeout) clearTimeout(timeout); });
        observer = new ResizeObserver(() => instance?.invalidateSize());
        observer.observe(container.current);
        setReady(true);
      } catch { fail(); }
    }
    void initialize();
    return () => {
      cancelled = true;
      if (resizeFrame !== undefined) cancelAnimationFrame(resizeFrame);
      if (timeout) clearTimeout(timeout);
      observer?.disconnect();
      try { instance?.remove(); } catch { /* Already removed by a failed layer. */ }
      map.current = null;
      circle.current = null;
      markers.current.clear();
      pins.current = null;
      leaflet.current = null;
    };
    // Initialize once after data arrives; booking updates only update the pins.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasData, failure]);

  useEffect(() => {
    if (!ready || !data || failure) return;
    try {
      circle.current?.setRadius(data.settings.serviceRadiusMiles * 1609.344);
      map.current?.fitBounds([[data.bounds.south, data.bounds.west], [data.bounds.north, data.bounds.east]], { padding: [12, 12] });
    } catch { setFailure("Service area unavailable"); }
    // Keep the user's map position when only filters change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, data?.settings.serviceRadiusMiles, failure]);

  useEffect(() => {
    const L = leaflet.current;
    const layer = pins.current;
    if (!ready || !data || !L || !layer || failure) return;
    try {
      layer.clearLayers();
      markers.current.clear();
      for (const job of data.jobs) {
        const added = previous.current !== null && !previous.current.has(job.id);
        const icon = L.divIcon({
          className: "job-marker-icon", iconSize: [20, 20], iconAnchor: [10, 10],
          html: `<span class="job-pin ${serviceClasses[job.service]} ${job.id === data.newestId ? "job-newest" : ""} ${added ? "job-drop" : ""}"><span></span></span>`,
        });
        const label = `${job.date} ${job.time} · ${job.title} · ${job.distanceMiles.toFixed(1)} mi · ${job.withinServiceArea ? "In service area" : "Outside service area"}`;
        const tooltip = document.createElement("span");
        tooltip.textContent = label;
        const marker = L.marker([job.lat, job.lng], { icon, title: label }).bindTooltip(tooltip).addTo(layer);
        marker.on("click", () => setSelectedId(job.id));
        markers.current.set(job.id, marker);
      }
      previous.current = new Set(data.jobs.map(job => job.id));
    } catch { setFailure("Map pins unavailable"); }
  }, [data, ready, failure]);

  return <div className={expanded ? "job-map-wrap job-map-expanded" : "job-map-wrap"}>
    {expanded && <div className="space-y-4 border-b pb-4">
      <fieldset className="flex flex-wrap gap-x-4 gap-y-2"><legend className="mb-2 text-xs text-muted-foreground">Service / action</legend>{JOB_SERVICES.map(service => <label key={service} className="flex items-center gap-2 text-xs"><Checkbox checked={!filters.services || filters.services.includes(service)} onCheckedChange={checked => {
        const current = filters.services ?? JOB_SERVICES;
        setFilters({ ...filters, services: checked ? [...current, service] : current.filter(value => value !== service) });
      }} /><span className={serviceClasses[service]}>{service}</span></label>)}</fieldset>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-[1fr_1fr_1fr_auto]">
        <label className="space-y-1 text-xs text-muted-foreground">From<Input aria-label="Schedule start date" type="date" value={filters.from ?? ""} onChange={event => setFilters({ ...filters, from: event.target.value })} /></label>
        <label className="space-y-1 text-xs text-muted-foreground">To<Input aria-label="Schedule end date" type="date" min={filters.from} value={filters.to ?? ""} onChange={event => setFilters({ ...filters, to: event.target.value })} /></label>
        <div className="space-y-1"><p className="text-xs text-muted-foreground">Service area</p><Select value={filters.area ?? "all"} onValueChange={area => { if (area === "all" || area === "inside" || area === "outside") setFilters({ ...filters, area }); }}><SelectTrigger aria-label="Service area filter" className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All locations</SelectItem><SelectItem value="inside">Inside radius</SelectItem><SelectItem value="outside">Outside radius</SelectItem></SelectContent></Select></div>
        <Button variant="outline" className="self-end" onClick={() => { setFilters({}); setSelectedId(null); }}><RotateCcw className="size-3.5" />Reset filters</Button>
      </div>
      <div className="flex items-center gap-4"><label id="radius-label" className="shrink-0 text-xs">Service radius <span className="num text-primary">{data?.settings.serviceRadiusMiles ?? "—"} mi</span></label><Slider aria-labelledby="radius-label" aria-label="Service radius in miles" min={SERVICE_RADIUS_RANGE.min} max={SERVICE_RADIUS_RANGE.max} step={SERVICE_RADIUS_RANGE.step} value={[data?.settings.serviceRadiusMiles ?? 12]} disabled={!data} onValueChange={values => { const radius = values[0]; if (radius !== undefined) void setServiceRadiusMiles(radius); }} /><span className="num shrink-0 text-[10px] text-muted-foreground">1–50 mi</span></div>
    </div>}
    <div className={expanded ? "job-map-schedule-layout" : undefined}><div className="min-w-0">
    <div className="job-map-frame" style={height ? { height } : undefined}>
      {!failure && <div ref={container} className="job-map" aria-label="Detroit job locations" />}
      {(!ready || failure) && <div className={failure ? "job-map-fallback" : "job-map-loading"}>{data && <FallbackMap data={data} />}</div>}
      {failure && <span className="job-map-status" role="status">{failure}</span>}
    </div>
    <div className="job-map-legend">{[...new Set(data?.jobs.map(job => job.service) ?? [])].map(service => <span key={service} className={serviceClasses[service]}><i />{service}</span>)}<span className="num">{data?.settings.serviceRadiusMiles ?? "—"} mi</span></div>
    <div className="job-map-credit">{credit}</div>
    </div>{expanded && <section className="min-w-0" aria-label="Map schedule"><div className="flex flex-wrap items-center justify-between gap-2 border-b py-2 text-xs"><h3>Schedule · <span className="num">{data?.jobs.length ?? 0}</span></h3><span className="num text-muted-foreground">{data?.counts.inside ?? 0} inside · {data?.counts.outside ?? 0} outside</span></div><div className="job-schedule-list" aria-live="polite">{data?.schedule.map(job => <Button key={job.id} variant="ghost" aria-pressed={selectedId === job.id} className={"h-auto w-full justify-start gap-3 whitespace-normal rounded-none border-b px-2 py-3 text-left " + (selectedId === job.id ? "bg-primary/10" : "")} onClick={() => { setSelectedId(job.id); map.current?.panTo([job.lat, job.lng]); markers.current.get(job.id)?.openTooltip(); }}><MapPin className={"size-4 shrink-0 " + serviceClasses[job.service]} /><span className="min-w-0 flex-1"><span className="num block text-[10px] text-muted-foreground">{job.date} · {job.time}</span><span className="block break-words text-xs">{job.title}</span><span className={"mt-1 block text-[10px] " + (job.withinServiceArea ? "text-primary" : "text-destructive")}>{job.distanceMiles.toFixed(1)} mi · {job.withinServiceArea ? "Inside radius" : "Outside radius"}</span></span></Button>)}{data && data.jobs.length === 0 && <p className="py-6 text-center text-xs text-muted-foreground">No matching jobs</p>}</div></section>}</div>
  </div>;
}

function FallbackMap({ data }: { data: MapData }) {
  const { bounds, settings } = data;
  const x = (lng: number) => 12 + (lng - bounds.west) / (bounds.east - bounds.west) * 276;
  const y = (lat: number) => 138 - (lat - bounds.south) / (bounds.north - bounds.south) * 126;
  const latRadius = settings.serviceRadiusMiles / 69;
  const lngRadius = latRadius / Math.cos(settings.base.lat * Math.PI / 180);
  return <svg viewBox="0 0 300 150" className="h-full w-full" aria-label="Offline Detroit job locations">
    <path d="M0 35H300 M0 70H300 M0 105H300 M60 0V150 M120 0V150 M180 0V150 M240 0V150" fill="none" stroke="var(--border)" />
    <ellipse cx={x(settings.base.lng)} cy={y(settings.base.lat)} rx={x(settings.base.lng + lngRadius) - x(settings.base.lng)} ry={y(settings.base.lat) - y(settings.base.lat + latRadius)} fill="var(--primary)" fillOpacity=".06" stroke="var(--primary)" strokeDasharray="4 4" />
    <text x="12" y="18" fill="var(--muted-foreground)" fontSize="9">DETROIT</text>
    <g transform={`translate(${x(settings.base.lng)}, ${y(settings.base.lat)})`}><title>{settings.businessName}</title><path d="M-5 1L0-4L5 1V6H-5Z" fill="var(--foreground)" /></g>
    {data.jobs.map(job => <g key={job.id} transform={`translate(${x(job.lng)}, ${y(job.lat)})`} className={serviceClasses[job.service]}><title>{job.title} · {job.withinServiceArea ? "In service area" : "Outside service area"}</title><g className="job-fallback-drop"><circle r="7" className={job.id === data.newestId ? "job-fallback-pulse" : ""} fill="currentColor" fillOpacity=".2" /><circle r="3" fill="currentColor" /></g></g>)}
  </svg>;
}