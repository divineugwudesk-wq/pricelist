import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser, UnauthorizedError } from "@/lib/server-auth";
import { businessSchema } from "@/lib/validation";

/** Update business profile (business owner only, own business). */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new UnauthorizedError();

    const business = await prisma.business.findFirst({
      where: { id: params.id, userId: user.id },
    });
    if (!business) {
      return NextResponse.json({ error: "Business not found." }, { status: 404 });
    }

    const body = await request.json();
    const parsed = businessSchema.partial().safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Please check the form." },
        { status: 400 },
      );
    }

    const updated = await prisma.business.update({
      where: { id: business.id },
      data: {
        name: parsed.data.name,
        description: parsed.data.description ?? null,
        category: parsed.data.category,
        whatsappNumber: parsed.data.whatsappNumber ?? null,
        phone: parsed.data.phone ?? null,
        address: parsed.data.address ?? null,
        instagram: parsed.data.instagram ?? null,
        tiktok: parsed.data.tiktok ?? null,
        facebook: parsed.data.facebook ?? null,
        x: parsed.data.x ?? null,
        website: parsed.data.website ?? null,
      },
    });

    return NextResponse.json({ business: updated });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("[business:PATCH]", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
