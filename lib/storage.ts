// Storage abstraction.
// Dev/production default: local disk under public/uploads (served as /uploads/*).
// Set STORAGE_PROVIDER=s3 to use an S3-compatible bucket (implementation hook included).
// Images are NEVER stored in the database — only URLs are.

import { randomBytes, createHash } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
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

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");
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

/** Decode base64 and persist locally. Returns the public URL. */
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

  const buffer = Buffer.from(base64Data, "base64");
  validateUpload(contentType, buffer.length);

  const hash = createHash("sha256").update(buffer).digest("hex").slice(0, 16);
  const rand = randomBytes(3).toString("hex");
  const ext = extensionFor(contentType);
  const safeName = filename.replace(/[^a-zA-Z0-9.-]/g, "_").slice(0, 60) || "image";
  const storedName = `${Date.now().toString(36)}-${rand}-${hash}-${safeName}.${ext}`;

  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(path.join(UPLOAD_DIR, storedName), buffer);

  return { url: `${UPLOAD_URL}/${storedName}`, size: buffer.length };
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

/** Best-effort delete; local files are kept unless explicitly removed. */
export async function deleteImage(_url: string): Promise<void> {
  // Intentionally a no-op for local dev to avoid deleting shared assets.
}
