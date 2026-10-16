import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser, UnauthorizedError } from "@/lib/server-auth";
import { checkoutSchema } from "@/lib/validation";
import { createOrder, updateOrderStatus } from "@/lib/orders";
import { formatNaira } from "@/lib/money";

export const dynamic = "force-dynamic";

/**
 * Customer-facing checkout. Creates a real order with price
 * snapshots. No payment processing — the customer completes the
 * order in WhatsApp.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = checkoutSchema.safeParse(body);
    if (!parsed.success) {
      const messages = parsed.error.issues.map((i) => i.message);
      return NextResponse.json(
        { error: messages[0] ?? "Please check your order." },
        { status: 400 },
      );
    }

    // Resolve business from the products (businessId embedded per item
    // is not trusted; all items must belong to one business).
    const productIds = parsed.data.items.map((i) => i.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds }, isAvailable: true },
      select: { id: true, businessId: true },
    });
    if (products.length !== new Set(productIds).size) {
      return NextResponse.json(
        { error: "Some items are no longer available." },
        { status: 400 },
      );
    }
    const businessIds = new Set(products.map((p) => p.businessId));
    if (businessIds.size !== 1) {
      return NextResponse.json(
        { error: "Your cart contains items from different stores." },
        { status: 400 },
      );
    }
    const businessId = [...businessIds][0];

    const order = await createOrder({
      businessId,
      items: parsed.data.items,
      customerName: parsed.data.customerName,
      customerPhone: parsed.data.customerPhone,
      customerNote: parsed.data.customerNote,
      sessionId: parsed.data.sessionId,
    });

    return NextResponse.json({ order }, { status: 201 });
  } catch (error) {
    console.error("[orders:POST]", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}

/** Business owner: list orders for their store. */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new UnauthorizedError();

    const business = await prisma.business.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });
    if (!business) {
      return NextResponse.json({ orders: [] });
    }

    const status = request.nextUrl.searchParams.get("status");
    const orders = await prisma.order.findMany({
      where: {
        businessId: business.id,
        ...(status && status !== "ALL" ? { status } : {}),
      },
      include: { items: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json({
      orders: orders.map((o) => ({
        ...o,
        displayTotal: formatNaira(o.total),
      })),
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("[orders:GET]", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}

/** Business owner: update order status. */
export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new UnauthorizedError();

    const body = (await request.json()) as {
      orderId: string;
      status: "NEW" | "CONTACTED" | "CONFIRMED" | "COMPLETED" | "CANCELLED";
    };
    if (!body.orderId || !body.status) {
      return NextResponse.json(
        { error: "Order ID and status are required." },
        { status: 400 },
      );
    }

    const business = await prisma.business.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });
    if (!business) {
      return NextResponse.json({ error: "Business not found." }, { status: 404 });
    }

    const order = await updateOrderStatus(body.orderId, business.id, body.status);
    return NextResponse.json({ order });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("[orders:PUT]", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
