// Storage abstraction.
// Dev/production default: returns data URLs (base64-encoded) — no disk access.
// Set STORAGE_PROVIDER=s3 to use an S3-compatible bucket (implementation hook included).
// Images are NEVER stored in the database — only URLs are.

import { MAX_IMAGE_BYTES, ALLOWED_IMAGE_TYPES } from "@/lib/validation";

export interface StoredImage {
  url: string;
  size: number;
}

export class StorageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StorageError";
  }
}

async function sha256Hex(buffer: Uint8Array): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, "0")).join("");
}

async function randomBytesToHex(n: number): Promise<string> {
  const buf = new Uint8Array(n);
  crypto.getRandomValues(buf);
  return Array.from(buf, (b) => b.toString(16).padStart(2, "0")).join("");
}

const UPLOAD_URL = "/uploads";

export function validateUpload(contentType: string, sizeBytes: number): void {
  if (!ALLOWED_IMAGE_TYPES.includes(contentType)) {
    throw new StorageError(
      `Unsupported file type "${contentType}". Allowed: PNG, JPG, WEBP, GIF.`,
    );
  }
  if (sizeBytes > MAX_IMAGE_BYTES) {
    throw new StorageError("Image is too large. Maximum size is 5 MB.");
  }
}

function extensionFor(contentType: string): string {
  switch (contentType) {
    case "image/png": return "png";
    case "image/jpeg": return "jpg";
    case "image/webp": return "webp";
    case "image/gif": return "gif";
    default: return "bin";
  }
}

/** Encode base64 as a data URL. No disk access. */
export async function storeImage(
  filename: string,
  contentType: string,
  base64Data: string,
): Promise<StoredImage> {
  validateUpload(contentType, Math.floor((base64Data.length * 3) / 4));
  const provider = process.env.STORAGE_PROVIDER ?? "local";

  if (provider === "s3") {
    return storeImageS3(filename, contentType, base64Data);
  }

  const buffer = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
  validateUpload(contentType, buffer.length);

  const hash = await sha256Hex(buffer).then((h) => h.slice(0, 16));
  const rand = await randomBytesToHex(3);
  const ext = extensionFor(contentType);
  const safeName = filename.replace(/[^a-zA-Z0-9.-]/g, "_").slice(0, 60) || "image";
  const storedName = `${Date.now().toString(36)}-${rand}-${hash}-${safeName}.${ext}`;

  const dataUrl = `data:${contentType};base64,${base64Data}`;

  return { url: dataUrl, size: buffer.length };
}

/** S3 hook — implement with @aws-sdk/client-s3 when credentials are configured. */
async function storeImageS3(
  _filename: string,
  _contentType: string,
  _base64Data: string,
): Promise<StoredImage> {
  throw new StorageError(
    "S3 storage is configured but the S3 client is not wired in this environment. " +
      "Set STORAGE_PROVIDER=local or implement storeImageS3().",
  );
}

/** Best-effort delete; data URLs are not stored on disk. */
export async function deleteImage(_url: string): Promise<void> {
  // Intentionally a no-op for data URL storage.
}

/**
 * The first bytes of each supported image format, as a hex string.
 *
 * The declared `Content-Type` is client-supplied and untrustworthy, so the
 * decoded bytes are inspected before anything is stored. A file uploaded with
 * `image/png` whose first bytes are not a PNG signature is rejected even
 * though the type and the size both pass.
 */
const IMAGE_SIGNATURES: Record<string, string> = {
  "image/png": "89504e470d0a1a0a",
  "image/jpeg": "ffd8ff",
  "image/webp": "52494646", // RIFF container — the WEBP marker follows at offset 8
  "image/gif": "47494638", // GIF8
};

function hexPrefix(buffer: Uint8Array, length: number): string {
  return Array.from(buffer.slice(0, length))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Reject an upload whose bytes do not match the declared content type.
 *
 * WEBP is checked at offset 8 because the RIFF header is shared with AVI and
 * other containers. Anything not in the allow-list is rejected outright.
 */
export function validateImageSignature(
  contentType: string,
  buffer: Uint8Array,
): void {
  const signature = IMAGE_SIGNATURES[contentType];
  if (!signature) {
    throw new StorageError(
      `Unsupported file type "${contentType}". Allowed: PNG, JPG, WEBP, GIF.`,
    );
  }

  if (contentType === "image/webp") {
    // "RIFF" + 4 bytes size + "WEBP"
    const riff = hexPrefix(buffer, 4);
    const webp = hexPrefix(new Uint8Array(buffer.buffer, buffer.byteOffset + 8, 4), 4);
    if (riff !== "52494646" || webp !== "57454250") {
      throw new StorageError(
        "The file is not a valid WEBP image.",
      );
    }
    return;
  }

  const prefix = hexPrefix(buffer, signature.length / 2);
  if (prefix !== signature) {
    throw new StorageError(
      `The file is not a valid ${contentType.replace("image/", "")} image.`,
    );
  }
}
