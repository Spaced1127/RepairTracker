import QRCode from "qrcode";
import { headers } from "next/headers";

/** Absolute URL for a path on this deployment (works on localhost and Vercel). */
export async function absoluteUrl(path: string) {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}${path}`;
}

export const qrSvg = (text: string) =>
  QRCode.toString(text, { type: "svg", margin: 0, errorCorrectionLevel: "M" });
