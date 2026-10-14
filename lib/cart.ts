// Cart calculation — pure, integer-safe business logic.
// All money is kobo. No floating point.

export interface CartLine {
  productId: string;
  name: string;
  priceKobo: number;
  salePriceKobo: number | null;
  quantity: number;
  imageUrl?: string | null;
}

export interface CartTotals {
  subtotalKobo: number; // sum of effective price × qty
  savingsKobo: number; // discount from sale prices
  totalKobo: number;
  itemCount: number;
  lines: Array<CartLine & { lineTotalKobo: number; effectivePriceKobo: number }>;
}

export const MAX_CART_QUANTITY = 999;
export const MAX_CART_LINES = 200;

export function effectivePrice(line: Pick<CartLine, "priceKobo" | "salePriceKobo">): number {
  if (
    line.salePriceKobo !== null &&
    line.salePriceKobo !== undefined &&
    line.salePriceKobo > 0 &&
    line.salePriceKobo < line.priceKobo
  ) {
    return line.salePriceKobo;
  }
  return line.priceKobo;
}

export function calculateCart(lines: CartLine[]): CartTotals {
  let subtotal = 0;
  let savings = 0;
  let itemCount = 0;
  const computed = lines.slice(0, MAX_CART_LINES).map((line) => {
    const quantity = Math.max(1, Math.min(MAX_CART_QUANTITY, Math.floor(line.quantity) || 1));
    const effective = effectivePrice(line);
    const lineTotal = effective * quantity;
    const fullPriceTotal = line.priceKobo * quantity;
    subtotal += lineTotal;
    savings += fullPriceTotal - lineTotal;
    itemCount += quantity;
    return { ...line, quantity, effectivePriceKobo: effective, lineTotalKobo: lineTotal };
  });
  return {
    subtotalKobo: subtotal,
    savingsKobo: savings,
    totalKobo: subtotal,
    itemCount,
    lines: computed,
  };
}
