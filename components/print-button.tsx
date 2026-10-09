"use client";

import { btnPrimary } from "./ui";

export function PrintButton({ label = "Print or save as PDF" }: { label?: string }) {
  return <button type="button" onClick={() => window.print()} className={btnPrimary}>{label}</button>;
}
