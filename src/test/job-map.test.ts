import { beforeEach, describe, expect, it } from "vitest";
import { addBooking, distanceMiles, getBookings, getJobMapData, getSettings, resetDemo, runDemoBooking, setServiceRadiusMiles, subscribe } from "@/lib/data";

describe("job map data", () => {
  beforeEach(async () => { await resetDemo(); });
  it("haversine reports zero for the same location", () => {
    expect(distanceMiles(42.348, -83.058, 42.348, -83.058)).toBe(0);
  });
  it("calculates statute miles symmetrically across the date line", () => {
    expect(distanceMiles(0, 0, 0, 1)).toBeCloseTo(69.0934, 3);
    expect(distanceMiles(0, 179, 0, -179)).toBeCloseTo(138.1868, 3);
    expect(distanceMiles(42, -83, 43, -84)).toBeCloseTo(distanceMiles(43, -84, 42, -83), 8);
  });
  it("every seeded booking and the base has explicit coordinates", async () => {
    expect(await getBookings()).toHaveLength(5);
    for (const job of await getBookings()) {
      expect(Number.isFinite(job.lat)).toBe(true);
      expect(Number.isFinite(job.lng)).toBe(true);
      expect(job.service).toBeTruthy();
    }
    const { base } = await getSettings();
    expect(Number.isFinite(base.lat) && Number.isFinite(base.lng)).toBe(true);
  });
  it("service-area check compares haversine distance with the settings radius", async () => {
    const { base } = await getSettings();
    await addBooking({ title: "At base", date: "2026-10-28", time: "12:00", ...base });
    await addBooking({ title: "Far away", date: "2026-10-28", time: "13:00", lat: 41, lng: -83 });
    const data = await getJobMapData();
    expect(data.jobs.find(job => job.title === "At base")?.withinServiceArea).toBe(true);
    expect(data.jobs.find(job => job.title === "Far away")?.withinServiceArea).toBe(false);
  });
  it("demo booking becomes the newest geographically located pin", async () => {
    await runDemoBooking();
    const data = await getJobMapData();
    expect(data.jobs).toHaveLength(6);
    expect(data.newestId).toBe(data.jobs[5]?.id);
    expect(data.jobs[5]?.lat).toBe(42.385);
    expect(data.jobs[5]?.lng).toBe(-82.976);
  });
  it("filters services and actions for both pins and schedule", async () => {
    const data = await getJobMapData({ services: ["Full Detail", "Supply run"] });
    expect(data.jobs).toHaveLength(3);
    expect(data.schedule.map(job => job.id).sort()).toEqual(data.jobs.map(job => job.id).sort());
    expect((await getJobMapData({ services: [] })).jobs).toHaveLength(0);
  });
  it("filters an inclusive date range and orders schedule by date and time", async () => {
    await addBooking({ title: "Early", date: "2026-11-01", time: "08:00" });
    await addBooking({ title: "Late", date: "2026-11-01", time: "16:00" });
    await addBooking({ title: "Next day", date: "2026-11-02", time: "10:00" });
    const data = await getJobMapData({ from: "2026-11-01", to: "2026-11-01", services: ["Other"] });
    expect(data.schedule.map(job => job.title)).toEqual(["Early", "Late"]);
    expect(data.jobs).toHaveLength(2);
  });
  it("changing radius reclassifies jobs and notifies shared maps", async () => {
    let updates = 0;
    const unsubscribe = subscribe("settings", () => { updates++; });
    await setServiceRadiusMiles(1);
    expect((await getJobMapData({ area: "outside" })).jobs.some(job => job.title.startsWith("Roy Henderson"))).toBe(true);
    await setServiceRadiusMiles(50);
    const data = await getJobMapData({ area: "inside" });
    expect(data.jobs).toHaveLength(5);
    expect(data.counts).toEqual({ inside: 5, outside: 0 });
    expect((await getSettings()).serviceRadiusMiles).toBe(50);
    expect(updates).toBe(2);
    unsubscribe();
    await setServiceRadiusMiles(12);
    expect(updates).toBe(2);
  });
  it("rejects invalid radii without changing the service area", async () => {
    for (const radius of [0, 51, NaN]) await expect(setServiceRadiusMiles(radius)).rejects.toThrow();
    expect((await getSettings()).serviceRadiusMiles).toBe(12);
  });
});