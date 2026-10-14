import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser, UnauthorizedError } from "@/lib/server-auth";
import { productSchema } from "@/lib/validation";
import { getActivePlan, checkProductLimit, PLANS } from "@/lib/plans";
import { uniqueSlug } from "@/lib/utils";

/**
 * Duplicate a product — copies everything including the image.
 * Counts against the plan product limit like a new product.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new UnauthorizedError();

    const source = await prisma.product.findFirst({
      where: { id: params.id, business: { userId: user.id } },
    });
    if (!source) {
      return NextResponse.json({ error: "Product not found." }, { status: 404 });
    }

    const plan = await getActivePlan(user.id);
    const count = await prisma.product.count({
      where: { businessId: source.businessId },
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

    const slugs = await prisma.product.findMany({
      where: { businessId: source.businessId },
      select: { slug: true },
    });
    const slug = uniqueSlug(`${source.name} copy`, new Set(slugs.map((s) => s.slug)));

    const product = await prisma.product.create({
      data: {
        businessId: source.businessId,
        categoryId: source.categoryId,
        name: `${source.name} (copy)`,
        slug,
        description: source.description,
        price: source.price,
        salePrice: source.salePrice,
        imageUrl: source.imageUrl,
        images: source.images,
        type: source.type,
        sku: source.sku ? `${source.sku}-copy` : null,
        isAvailable: source.isAvailable,
        isFeatured: false,
      },
      include: { category: true },
    });

    return NextResponse.json(
      {
        product: {
          ...product,
          images: product.images ? JSON.parse(product.images) : [],
        },
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("[product:duplicate]", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
