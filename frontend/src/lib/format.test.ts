import { describe, expect, it } from "vitest";
import { formatDate, formatMoney } from "./format";

describe("locale formatting", () => {
  it("formats integer FCFA amounts in both locales", () => {
    expect(formatMoney(12500, "fr").replace(/[\u00a0\u202f]/g, " ")).toBe("12 500 FCFA");
    expect(formatMoney(12500, "en")).toBe("12,500 FCFA");
  });

  it("formats dates in Africa/Douala rather than UTC", () => {
    const instant = new Date("2026-11-09T23:30:00Z");
    expect(formatDate(instant, "en")).toContain("10 Nov 2026");
  });
});
