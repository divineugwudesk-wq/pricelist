import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, UnauthorizedError } from "@/lib/server-auth";
import { storeImage, StorageError, validateImageSignature } from "@/lib/storage";
import { z } from "zod";

export const dynamic = "force-dynamic";

const MAX_BASE64_LENGTH = 7 * 1024 * 1024; // base64 inflates ~33%

const uploadSchema = z.object({
  filename: z.string().max(120),
  contentType: z.string(),
  data: z.string().max(MAX_BASE64_LENGTH),
});

/**
 * Image upload endpoint. Validates MIME type and size server-side,
 * inspects the file bytes, stores through the storage abstraction,
 * and returns a public URL.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new UnauthorizedError();

    const body = await request.json();
    const parsed = uploadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid upload request." },
        { status: 400 },
      );
    }

    try {
      const buffer = Uint8Array.from(atob(parsed.data.data), (c) => c.charCodeAt(0));
      // The declared Content-Type is client-supplied and untrustworthy, so the
      // decoded bytes are inspected before anything is stored.
      validateImageSignature(parsed.data.contentType, buffer);

      const stored = await storeImage(
        parsed.data.filename,
        parsed.data.contentType,
        parsed.data.data,
      );
      return NextResponse.json({ url: stored.url, size: stored.size });
    } catch (error) {
      if (error instanceof StorageError) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      throw error;
    }
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("[upload]", error);
    return NextResponse.json(
      { error: "Upload failed. Please try a different image." },
      { status: 500 },
    );
  }
}
