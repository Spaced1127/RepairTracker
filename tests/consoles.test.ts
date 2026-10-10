import { describe, expect, it } from "vitest";
import { CONSOLE_GROUPS, OTHER, choiceFor, otherTextFor, parseConsole } from "@/lib/consoles";

describe("console choices", () => {
  it("round-trips every listed console", () => {
    for (const g of CONSOLE_GROUPS) {
      for (const m of g.models) {
        const choice = choiceFor(g.brand, m);
        expect(choice).toBe(`${g.brand}|${m}`);
        expect(parseConsole(choice, "")).toEqual({ console_type: g.brand, model: m });
      }
    }
  });
  it("sends unknown devices to Other with the typed name", () => {
    expect(parseConsole(OTHER, "  Sega Dreamcast ")).toEqual({ console_type: "Other", model: "Sega Dreamcast" });
    expect(choiceFor("PlayStation", "PS5 Slim")).toBe(OTHER);
  });
  it("keeps the old name when editing legacy tickets", () => {
    expect(otherTextFor("PlayStation", "PS5 Slim")).toBe("PlayStation PS5 Slim");
    expect(otherTextFor("Other", "Dreamcast")).toBe("Dreamcast");
  });
});
