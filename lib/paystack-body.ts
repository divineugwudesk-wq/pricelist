import { NextRequest } from "next/server";

/**
 * Paystack (and most webhook providers) sign the raw request body,
 * so body parsers must not re-serialize it. This reads the raw text.
 */
export async function getRawBody(request: NextRequest): Promise<string> {
  const buffer = await new Response(request.body ?? new ReadableStream()).text();
  return buffer;
}
