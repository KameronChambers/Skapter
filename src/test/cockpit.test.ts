import { beforeEach, describe, expect, it } from "vitest";
import { getBookings, getConversations, getExecutionLog, getMessages, resetDemo, deductRecipe, getInventory, getShoppingList, matchesFilters, getRules, deleteRule, getMonthRevenue, runDemoBooking, sendSimulatedCustomerMessage, subscribe } from "@/lib/data";
describe("cockpit demo contract", () => {
  beforeEach(async () => { await resetDemo(); });
  it("loads eight conversations with their messages", async () => {
    const conversations = await getConversations();
    expect(conversations).toHaveLength(8);
    for (const c of conversations) expect((await getMessages(c.id)).length).toBeGreaterThan(0);
  });
  it("returns a callable unsubscribe that stops notifications", async () => {
    let count = 0;
    const unsubscribe = subscribe("bookings", () => count++);
    await runDemoBooking();
    expect(count).toBe(1);
    expect(unsubscribe()).toBeUndefined();
    await runDemoBooking();
    expect(count).toBe(1);
  });
  it("demo booking adds one booking and one tool event", async () => {
    const before = await getBookings();
    await runDemoBooking();
    expect(await getBookings()).toHaveLength(before.length + 1);
    expect((await getExecutionLog())[0]?.action).toBe("create_booking");
  });
  it("provider chips use only the requested demo providers", async () => {
    for (const row of await getExecutionLog()) expect(["muse-spark-open", "muse-spark-1.3"]).toContain(row.provider);
  });
  it("simulator returns a conversation with the submitted message", async () => {
    const id = await sendSimulatedCustomerMessage("Thursday detail please");
    expect((await getMessages(id))[0]?.text).toBe("Thursday detail please");
  });
  it("Tahoe Premium Detail Large deducts the listed amounts", async () => {
    const before = Object.fromEntries((await getInventory()).map(i => [i.id, i.stock]));
    const r = await deductRecipe("Premium Detail", "Large");
    expect(r.ok).toBe(true);
    const after = Object.fromEntries((await getInventory()).map(i => [i.id, i.stock]));
    const expected = { water: 7, psoap: 7, gloves: 2, towels: 18, glass: 2, wax: 3, clay: 1, pint: 3, carpet: 4 };
    for (const [id, n] of Object.entries(expected)) expect((before[id] ?? 0) - (after[id] ?? 0)).toBeCloseTo(n);
    expect(Object.keys(expected).sort()).toEqual(r.usage.map(u => u.id).sort());
  });
  it("clay shortage is explained and added to the shopping list", async () => {
    for (let i = 0; i < 3; i++) expect((await deductRecipe("Premium Detail", "Large")).ok).toBe(true);
    const r = await deductRecipe("Premium Detail", "Large");
    expect(r.ok).toBe(false);
    expect(r.explanation).toContain("Clay bar");
    expect((await getShoppingList()).find(i => i.id === "clay")?.reason).toBeTruthy();
  });
  it("everyone not spam is a customer; filters combine", async () => {
    const convs = await getConversations();
    for (const c of convs) expect(c.tags.includes("Customer")).toBe(!c.tags.includes("Spam"));
    const both = convs.filter(c => matchesFilters(c, ["Customer", "Inquiry"]));
    expect(both.length).toBeGreaterThan(0);
    for (const c of both) expect(c.tags).toEqual(expect.arrayContaining(["Customer", "Inquiry"]));
    expect(convs.filter(c => matchesFilters(c, ["Spam", "Customer"]))).toHaveLength(0);
  });
  it("rules can be deleted", async () => {
    const first = (await getRules())[0]!;
    await deleteRule(first.id);
    expect((await getRules()).some(r => r.id === first.id)).toBe(false);
  });
  it("future months have no revenue data", () => {
    expect(getMonthRevenue(10)).toBeNull();
    expect(getMonthRevenue(9)?.length).toBeGreaterThan(0);
  });
});
