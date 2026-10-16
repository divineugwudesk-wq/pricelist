import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser, UnauthorizedError, NotFoundError } from "@/lib/server-auth";
import { categorySchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user) throw new UnauthorizedError();

    const category = await prisma.category.findFirst({
      where: { id, business: { userId: user.id } },
    });
    if (!category) throw new NotFoundError("Category not found.");

    const body = await request.json();
    const parsed = categorySchema.partial().safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Please enter a valid category name." },
        { status: 400 },
      );
    }

    const updated = await prisma.category.update({
      where: { id: category.id },
      data: {
        name: parsed.data.name,
        sortOrder: parsed.data.sortOrder,
      },
      include: { _count: { select: { products: true } } },
    });

    return NextResponse.json({ category: updated });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    console.error("[category:PATCH]", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user) throw new UnauthorizedError();

    const category = await prisma.category.findFirst({
      where: { id, business: { userId: user.id } },
      select: { id: true },
    });
    if (!category) throw new NotFoundError("Category not found.");

    // Products keep their data; they simply become uncategorized.
    await prisma.product.updateMany({
      where: { categoryId: category.id },
      data: { categoryId: null },
    });
    await prisma.category.delete({ where: { id: category.id } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    console.error("[category:DELETE]", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
