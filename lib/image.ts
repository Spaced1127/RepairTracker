const MAX_EDGE = 1920;

/** Shrinks a photo so uploads stay fast on a phone connection. Falls back to the original file. */
export async function shrink(file: File): Promise<Blob> {
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, MAX_EDGE / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", 0.85));
    return blob ?? file;
  } catch {
    return file;
  }
}

export const extFor = (blob: Blob, original: File) =>
  blob.type === "image/jpeg" ? "jpg" : (original.name.split(".").pop() || "img").toLowerCase();
