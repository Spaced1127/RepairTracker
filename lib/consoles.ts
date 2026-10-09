/** Console choices. Stored as console_type = brand and model = model name. */
export const CONSOLE_GROUPS: { brand: string; models: string[] }[] = [
  { brand: "Sony", models: ["PS5", "PS5 Slim", "PS5 Pro", "PS4", "PS4 Slim", "PS4 Pro"] },
  { brand: "Microsoft", models: ["Xbox Series X", "Xbox Series S", "Xbox One", "Xbox One S", "Xbox One X"] },
  { brand: "Nintendo", models: ["Switch 2", "Switch", "Switch OLED", "Switch Lite"] },
  { brand: "Valve", models: ["Steam Deck LCD", "Steam Deck OLED"] },
  { brand: "Asus", models: ["ROG Ally", "ROG Ally X"] },
];

export const OTHER = "other";

/** Select value for a stored device, or "other" when it is not in the list. */
export function choiceFor(consoleType: string, model: string | null): string {
  const found = CONSOLE_GROUPS.some((g) => g.brand === consoleType && g.models.includes(model ?? ""));
  return found ? `${consoleType}|${model}` : OTHER;
}

/** Free-text fallback shown in the "Other" box when editing an older or custom device. */
export function otherTextFor(consoleType: string, model: string | null): string {
  const legacy = consoleType && consoleType !== "Other" ? consoleType : "";
  return [legacy, model].filter(Boolean).join(" ");
}

export function parseConsole(choice: string, other: string): { console_type: string; model: string } {
  if (choice === OTHER || !choice.includes("|")) return { console_type: "Other", model: other.trim() };
  const [console_type, model] = choice.split("|");
  return { console_type, model };
}
