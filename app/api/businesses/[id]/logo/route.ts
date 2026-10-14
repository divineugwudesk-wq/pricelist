import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, UnauthorizedError } from "@/lib/server-auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const schema = z.object({ logoUrl: z.string().min(1).max(500) });

/** Upload/set the business logo (owner only). */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new UnauthorizedError();

    const business = await prisma.business.findFirst({
      where: { id: params.id, userId: user.id },
      select: { id: true, logoUrl: true },
    });
    if (!business) {
      return NextResponse.json({ error: "Business not found." }, { status: 404 });
    }

    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid logo URL." }, { status: 400 });
    }

    const updated = await prisma.business.update({
      where: { id: business.id },
      data: { logoUrl: parsed.data.logoUrl },
    });

    return NextResponse.json({ business: updated });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("[logo:PUT]", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
