import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser, UnauthorizedError } from "@/lib/server-auth";
import { categorySchema } from "@/lib/validation";
import { getActivePlan, checkCategoryLimit, PLANS } from "@/lib/plans";

export const dynamic = "force-dynamic";

/** List business categories. */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) throw new UnauthorizedError();
    const categories = await prisma.category.findMany({
      where: { business: { userId: user.id } },
      orderBy: { sortOrder: "asc" },
      include: { _count: { select: { products: true } } },
    });
    return NextResponse.json({ categories });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("[categories:GET]", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}

/** Create a category (plan-limited, server-enforced). */
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

    const body = await request.json();
    const parsed = categorySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Please enter a valid category name." },
        { status: 400 },
      );
    }

    const plan = await getActivePlan(user.id);
    const count = await prisma.category.count({
      where: { businessId: business.id },
    });
    const limitCheck = checkCategoryLimit(plan, count);
    if (!limitCheck.ok) {
      const upgrade = PLANS[limitCheck.upgradeTo];
      return NextResponse.json(
        {
          error: limitCheck.message,
          code: "PLAN_LIMIT",
          upgradeTo: limitCheck.upgradeTo,
          upgradePrice: upgrade.priceKobo,
        },
        { status: 403 },
      );
    }

    const maxOrder = await prisma.category.aggregate({
      where: { businessId: business.id },
      _max: { sortOrder: true },
    });

    const category = await prisma.category.create({
      data: {
        businessId: business.id,
        name: parsed.data.name,
        sortOrder: parsed.data.sortOrder ?? (maxOrder._max.sortOrder ?? -1) + 1,
      },
      include: { _count: { select: { products: true } } },
    });

    return NextResponse.json({ category }, { status: 201 });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("[categories:POST]", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
