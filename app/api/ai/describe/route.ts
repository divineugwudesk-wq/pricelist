import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, UnauthorizedError } from "@/lib/server-auth";
import { describeProduct } from "@/lib/ai";
import { aiDescribeSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

/**
 * AI product description generator.
 * Works with or without an OpenAI key — the service layer
 * falls back to a rule-based generator.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new UnauthorizedError();

    const body = await request.json();
    const parsed = aiDescribeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Please enter a product name first." },
        { status: 400 },
      );
    }

    const result = await describeProduct({
      name: parsed.data.name,
      category: parsed.data.category,
      businessName: parsed.data.businessName,
      tone: parsed.data.tone,
    });

    return NextResponse.json({ description: result.text, source: result.source });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("[ai:describe]", error);
    return NextResponse.json(
      { error: "Could not generate a description right now." },
      { status: 500 },
    );
  }
}
