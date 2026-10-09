"use client";

import { useState } from "react";
import { CONSOLE_GROUPS, OTHER, choiceFor, otherTextFor } from "@/lib/consoles";
import { Field, field } from "./ui";

export function ConsoleSelect({ consoleType, model }: { consoleType?: string; model?: string | null }) {
  const editing = Boolean(consoleType);
  const [choice, setChoice] = useState(editing ? choiceFor(consoleType!, model ?? null) : "");

  return (
    <>
      <Field label="Console">
        <select name="console_choice" required value={choice} onChange={(e) => setChoice(e.target.value)} className={field}>
          <option value="" disabled>Choose a console</option>
          {CONSOLE_GROUPS.map((g) => (
            <optgroup key={g.brand} label={g.brand}>
              {g.models.map((m) => (
                <option key={m} value={`${g.brand}|${m}`}>{g.brand} {m}</option>
              ))}
            </optgroup>
          ))}
          <option value={OTHER}>Other (type it in)</option>
        </select>
      </Field>
      {choice === OTHER && (
        <Field label="Console name" hint="For example Sega Dreamcast or Atari 2600">
          <input
            name="console_other"
            required
            defaultValue={editing ? otherTextFor(consoleType!, model ?? null) : ""}
            className={field}
          />
        </Field>
      )}
    </>
  );
}
