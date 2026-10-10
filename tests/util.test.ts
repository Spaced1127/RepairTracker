import { describe, expect, it } from "vitest";
import { accentFor, addDays, dayKey, deviceName, usd, weekStartKey } from "@/lib/util";

describe("shop-timezone days", () => {
  it("uses the shop's local date, not UTC", () => {
    // 02:30 UTC on Oct 10 is still the evening of Oct 9 in New York.
    expect(dayKey("2026-10-10T02:30:00Z")).toBe("2026-10-09");
  });
  it("adds days across month ends", () => {
    expect(addDays("2026-10-30", 3)).toBe("2026-11-02");
    expect(addDays("2026-10-09", -13)).toBe("2026-09-26");
  });
  it("finds the Monday of the week", () => {
    expect(weekStartKey("2026-10-09")).toBe("2026-10-05"); // Friday
    expect(weekStartKey("2026-10-05")).toBe("2026-10-05"); // Monday
    expect(weekStartKey("2026-10-11")).toBe("2026-10-05"); // Sunday
  });
});

describe("formatting", () => {
  it("formats cents as dollars, including negatives", () => {
    expect(usd(1234)).toBe("$12.34");
    expect(usd(-500)).toBe("-$5.00");
  });
  it("names devices", () => {
    expect(deviceName({ console_type: "Sony", model: "PS5" })).toBe("Sony PS5");
    expect(deviceName({ console_type: "Other", model: "Sega Dreamcast" })).toBe("Sega Dreamcast");
    expect(deviceName({ console_type: "Other", model: null })).toBe("Other device");
  });
  it("keeps colors for tickets created before the brand dropdown", () => {
    expect(accentFor("PlayStation")).toBe(accentFor("Sony"));
    expect(accentFor("Something else")).toBe(accentFor("Other"));
  });
});
