import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, UnauthorizedError } from "@/lib/server-auth";
import { generateLogoSvg, logoSvgToDataUrl } from "@/lib/logo";
import { logoGenerateSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

/**
 * Logo concept generator. Always available (offline SVG engine);
 * an AI image provider can be layered in behind the same interface.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new UnauthorizedError();

    const body = await request.json();
    const parsed = logoGenerateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Please fill in your business name and pick a style." },
        { status: 400 },
      );
    }

    const svg = generateLogoSvg({
      businessName: parsed.data.businessName,
      category: parsed.data.category,
      style: parsed.data.style,
      color: parsed.data.color,
    });

    return NextResponse.json({
      svg,
      dataUrl: logoSvgToDataUrl(svg),
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("[logo:generate]", error);
    return NextResponse.json(
      { error: "Could not generate logo concepts right now." },
      { status: 500 },
    );
  }
}
