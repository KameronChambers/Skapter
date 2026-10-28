import { beforeEach, describe, expect, it } from "vitest";
import { addBooking, distanceMiles, getBookings, getJobMapData, getSettings, resetDemo, runDemoBooking } from "@/lib/data";

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
});