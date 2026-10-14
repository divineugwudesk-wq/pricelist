// Order service — creates orders with price/name snapshots so historical
// orders remain correct when products change later.

import { prisma } from "@/lib/db";
import { NotFoundError } from "@/lib/server-auth";
import { calculateCart, effectivePrice, type CartLine } from "@/lib/cart";
import { recordEvent } from "@/lib/analytics";

export interface CreateOrderInput {
  businessId: string;
  items: { productId: string; quantity: number }[];
  customerName?: string | null;
  customerPhone?: string | null;
  customerNote?: string | null;
  sessionId?: string | null;
  source?: string;
}

export interface CreatedOrder {
  id: string;
  totalKobo: number;
  subtotalKobo: number;
  itemCount: number;
}

/**
 * Create an order from cart items. Product name and price are snapshotted
 * into order_items at purchase time — changing a product later must never
 * alter historical orders.
 */
export async function createOrder(input: CreateOrderInput): Promise<CreatedOrder> {
  const productIds = input.items.map((i) => i.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, businessId: input.businessId, isAvailable: true },
    select: {
      id: true, name: true, price: true, salePrice: true, isAvailable: true,
    },
  });
  if (products.length !== new Set(productIds).size) {
    throw new NotFoundError("One or more products are unavailable.");
  }

  const lines: CartLine[] = input.items.map((item) => {
    const product = products.find((p) => p.id === item.productId)!;
    return {
      productId: product.id,
      name: product.name,
      priceKobo: product.price,
      salePriceKobo: product.salePrice,
      quantity: item.quantity,
    };
  });

  const totals = calculateCart(lines);

  const order = await prisma.order.create({
    data: {
      businessId: input.businessId,
      customerName: input.customerName?.trim() || null,
      customerPhone: input.customerPhone?.trim() || null,
      customerNote: input.customerNote?.trim() || null,
      subtotal: totals.subtotalKobo,
      discount: totals.savingsKobo,
      total: totals.totalKobo,
      status: "NEW",
      source: input.source ?? "storefront",
      sessionId: input.sessionId ?? null,
      items: {
        create: totals.lines.map((line) => ({
          productId: line.productId,
          productNameSnapshot: line.name,
          priceSnapshot: effectivePrice(line),
          quantity: line.quantity,
          subtotal: line.lineTotalKobo,
        })),
      },
    },
    select: { id: true, total: true, subtotal: true, _count: { select: { items: true } } },
  });

  await recordEvent(input.businessId, "WHATSAPP_CLICK", {
    sessionId: input.sessionId ?? null,
    metadata: { orderId: order.id },
  });

  return {
    id: order.id,
    totalKobo: order.total,
    subtotalKobo: order.subtotal,
    itemCount: order._count.items,
  };
}

/** Update order status (business owner only, verified at the route layer). */
export async function updateOrderStatus(
  orderId: string,
  businessId: string,
  status: "NEW" | "CONTACTED" | "CONFIRMED" | "COMPLETED" | "CANCELLED",
) {
  const order = await prisma.order.findFirst({
    where: { id: orderId, businessId },
  });
  if (!order) throw new NotFoundError("Order not found.");
  return prisma.order.update({ where: { id: orderId }, data: { status } });
}
