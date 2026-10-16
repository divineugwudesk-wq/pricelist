import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser, UnauthorizedError } from "@/lib/server-auth";
import { productSchema } from "@/lib/validation";
import { getActivePlan, checkProductLimit, PLANS } from "@/lib/plans";
import { slugify, uniqueSlug } from "@/lib/utils";
import type { Product } from "@prisma/client";

export const dynamic = "force-dynamic";

function serializeProduct(p: Product) {
  return {
    ...p,
    images: p.images ? JSON.parse(p.images) : [],
  };
}

/** List the user's products. */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) throw new UnauthorizedError();
    const products = await prisma.product.findMany({
      where: { business: { userId: user.id } },
      include: { category: true },
      orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
    });
    const plan = await getActivePlan(user.id);
    return NextResponse.json({
      products: products.map(serializeProduct),
      limit: PLANS[plan].maxProducts,
      plan,
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("[products:GET]", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}

/**
 * Create a product. The plan product limit is enforced HERE,
 * server-side — frontend checks are only a courtesy.
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
      return NextResponse.json(
        { error: "Create your business profile first." },
        { status: 400 },
      );
    }

    const body = await request.json();
    const parsed = productSchema.safeParse(body);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        fieldErrors[issue.path.join(".")] = issue.message;
      }
      return NextResponse.json(
        { error: "Please check the product details.", fieldErrors },
        { status: 400 },
      );
    }

    const plan = await getActivePlan(user.id);
    const count = await prisma.product.count({
      where: { businessId: business.id },
    });
    const limitCheck = checkProductLimit(plan, count);
    if (!limitCheck.ok) {
      const upgrade = PLANS[limitCheck.upgradeTo];
      return NextResponse.json(
        {
          error: limitCheck.message,
          code: "PLAN_LIMIT",
          upgradeTo: limitCheck.upgradeTo,
          upgradePrice: upgrade.priceKobo,
          limit: PLANS[plan].maxProducts,
        },
        { status: 403 },
      );
    }

    // Verify the category belongs to this business.
    if (parsed.data.categoryId) {
      const category = await prisma.category.findFirst({
        where: { id: parsed.data.categoryId, businessId: business.id },
        select: { id: true },
      });
      if (!category) {
        return NextResponse.json(
          { error: "Invalid category." },
          { status: 400 },
        );
      }
    }

    const slugs = await prisma.product.findMany({
      where: { businessId: business.id },
      select: { slug: true },
    });
    const slug = uniqueSlug(parsed.data.name, new Set(slugs.map((s) => s.slug)));

    const product = await prisma.product.create({
      data: {
        businessId: business.id,
        categoryId: parsed.data.categoryId ?? null,
        name: parsed.data.name,
        slug,
        description: parsed.data.description ?? null,
        price: parsed.data.priceKobo,
        salePrice:
          parsed.data.salePriceKobo && parsed.data.salePriceKobo < parsed.data.priceKobo
            ? parsed.data.salePriceKobo
            : null,
        imageUrl: parsed.data.imageUrl || null,
        images: parsed.data.images?.length ? JSON.stringify(parsed.data.images) : null,
        type: parsed.data.type,
        sku: parsed.data.sku ?? null,
        isAvailable: parsed.data.isAvailable,
        isFeatured: parsed.data.isFeatured,
      },
      include: { category: true },
    });

    return NextResponse.json({ product: serializeProduct(product) }, { status: 201 });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("[products:POST]", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
