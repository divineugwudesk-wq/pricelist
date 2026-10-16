import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser, UnauthorizedError } from "@/lib/server-auth";
import { getActivePlan } from "@/lib/plans";
import { productSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

/**
 * Bulk product operations (owner-scoped):
 *   { action: "delete" | "availability" | "featured", productIds: string[], value?: boolean }
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new UnauthorizedError();

    const business = await prisma.business.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });
    if (!business) {
      return NextResponse.json({ error: "Business not found." }, { status: 404 });
    }

    const body = (await request.json()) as {
      action: string;
      productIds: string[];
      value?: boolean;
    };

    if (!Array.isArray(body.productIds) || body.productIds.length === 0) {
      return NextResponse.json(
        { error: "Select at least one product." },
        { status: 400 },
      );
    }

    // Scope every id to this business — never trust client ids blindly.
    const owned = await prisma.product.findMany({
      where: { id: { in: body.productIds }, businessId: business.id },
      select: { id: true },
    });
    const ownedIds = new Set(owned.map((p) => p.id));

    if (body.action === "delete") {
      await prisma.product.deleteMany({
        where: { id: { in: [...ownedIds] } },
      });
      return NextResponse.json({ ok: true, count: ownedIds.size });
    }

    if (body.action === "availability" || body.action === "featured") {
      const field =
        body.action === "availability" ? "isAvailable" : "isFeatured";
      await prisma.product.updateMany({
        where: { id: { in: [...ownedIds] } },
        data: { [field]: body.value === true },
      });
      return NextResponse.json({ ok: true, count: ownedIds.size });
    }

    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("[products:bulk]", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}

/** Quick search endpoint used by the dashboard. */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const search = request.nextUrl.searchParams.get("q") ?? "";
  const products = await prisma.product.findMany({
    where: {
      business: { userId: user.id },
      name: { contains: search },
    },
    select: { id: true, name: true, price: true, isAvailable: true, imageUrl: true },
    orderBy: { createdAt: "desc" },
    take: 25,
  });
  return NextResponse.json({ products });
}
