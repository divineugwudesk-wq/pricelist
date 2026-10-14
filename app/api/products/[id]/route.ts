import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser, UnauthorizedError } from "@/lib/server-auth";
import { productSchema, productUpdateSchema } from "@/lib/validation";
import { NotFoundError } from "@/lib/server-auth";
import type { Product } from "@prisma/client";

function serializeProduct(p: Product) {
  return {
    ...p,
    images: p.images ? JSON.parse(p.images) : [],
  };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new UnauthorizedError();
    const product = await prisma.product.findFirst({
      where: { id: params.id, business: { userId: user.id } },
      include: { category: true },
    });
    if (!product) throw new NotFoundError("Product not found.");
    return NextResponse.json({ product: serializeProduct(product) });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    console.error("[product:GET]", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new UnauthorizedError();

    const existing = await prisma.product.findFirst({
      where: { id: params.id, business: { userId: user.id } },
    });
    if (!existing) throw new NotFoundError("Product not found.");

    const body = await request.json();
    const parsed = productUpdateSchema.safeParse(body);
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

    if (parsed.data.categoryId) {
      const category = await prisma.category.findFirst({
        where: { id: parsed.data.categoryId, businessId: existing.businessId },
        select: { id: true },
      });
      if (!category) {
        return NextResponse.json({ error: "Invalid category." }, { status: 400 });
      }
    }

    if (
      parsed.data.salePriceKobo !== undefined &&
      parsed.data.salePriceKobo !== null &&
      parsed.data.salePriceKobo >= (parsed.data.priceKobo ?? existing.price)
    ) {
      return NextResponse.json(
        { error: "Sale price must be lower than the regular price." },
        { status: 400 },
      );
    }

    const updated = await prisma.product.update({
      where: { id: existing.id },
      data: {
        name: parsed.data.name,
        description: parsed.data.description ?? undefined,
        price: parsed.data.priceKobo,
        salePrice:
          parsed.data.salePriceKobo !== undefined
            ? parsed.data.salePriceKobo &&
              parsed.data.salePriceKobo < (parsed.data.priceKobo ?? existing.price)
              ? parsed.data.salePriceKobo
              : null
            : undefined,
        categoryId:
          parsed.data.categoryId !== undefined
            ? parsed.data.categoryId ?? null
            : undefined,
        imageUrl: parsed.data.imageUrl !== undefined ? parsed.data.imageUrl || null : undefined,
        images: parsed.data.images !== undefined
          ? parsed.data.images?.length
            ? JSON.stringify(parsed.data.images)
            : null
          : undefined,
        sku: parsed.data.sku !== undefined ? parsed.data.sku ?? null : undefined,
        type: parsed.data.type,
        isAvailable: parsed.data.isAvailable,
        isFeatured: parsed.data.isFeatured,
      },
      include: { category: true },
    });

    return NextResponse.json({ product: serializeProduct(updated) });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    console.error("[product:PATCH]", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new UnauthorizedError();

    const product = await prisma.product.findFirst({
      where: { id: params.id, business: { userId: user.id } },
      select: { id: true },
    });
    if (!product) throw new NotFoundError("Product not found.");

    await prisma.product.delete({ where: { id: product.id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    console.error("[product:DELETE]", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
