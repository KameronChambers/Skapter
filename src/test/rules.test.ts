import { describe, expect, it } from "vitest";
import { performanceLabel, stockStatus } from "@/lib/data";
describe("business rules", () => {
  it("stock status thresholds", () => {
    expect(stockStatus(80)).toBe("Great");
    expect(stockStatus(79)).toBe("Good");
    expect(stockStatus(59)).toBe("Fine");
    expect(stockStatus(49)).toBe("Low");
    expect(stockStatus(29)).toBe("Critical");
  });
  it("performance labels", () => {
    expect(performanceLabel(2)).toBe("Subpar");
    expect(performanceLabel(5)).toBe("Serviceable");
    expect(performanceLabel(7)).toBe("Adequate");
    expect(performanceLabel(8)).toBe("Exemplary");
  });
});
