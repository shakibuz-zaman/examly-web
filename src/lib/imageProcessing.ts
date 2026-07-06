export const MAX_DIMENSION = 1600;
export const MAX_BYTES = 5 * 1024 * 1024;
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

// Bangladesh mobile connections are the target: shrink at the source so a
// 4 MB phone photo never crosses the wire. Originals are not kept.
export async function downscaleIfNeeded(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);
  try {
    const { width, height } = bitmap;
    if (width <= MAX_DIMENSION && height <= MAX_DIMENSION) return file;

    const scale = MAX_DIMENSION / Math.max(width, height);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, file.type, 0.85),
    );
    if (!blob) return file;
    return new File([blob], file.name, { type: file.type });
  } finally {
    bitmap.close();
  }
}
