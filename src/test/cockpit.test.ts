import { beforeEach, describe, expect, it } from "vitest";
import { getBookings, getConversations, getExecutionLog, getMessages, recipeAmount, resetDemo, runDemoBooking, sendSimulatedCustomerMessage, subscribe } from "@/lib/data";
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
  it("vehicle previews scale quantities without mutating stock", () => {
    expect(recipeAmount(4, "Small")).toBe(3);
    expect(recipeAmount(4, "Medium")).toBe(4);
    expect(recipeAmount(4, "Large")).toBe(6);
  });
});
