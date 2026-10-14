// Money utilities. All money is stored as integer minor units (kobo).
// Never use floating point for money.

export const NAIRA_SYMBOL = "₦";

/** Parse a user-entered naira amount (e.g. "25,000" or "1250.50") into kobo. */
export function parseNairaToKobo(input: string | number): number {
  if (typeof input === "number") return Math.round(input * 100);
  const cleaned = String(input).replace(/[^\d.]/g, "");
  if (!cleaned) return 0;
  const naira = Number.parseFloat(cleaned);
  if (Number.isNaN(naira)) return 0;
  return Math.round(naira * 100);
}

/** Format kobo as a naira string. Whole amounts render without decimals. */
export function formatNaira(kobo: number | null | undefined): string {
  if (kobo === null || kobo === undefined || Number.isNaN(kobo)) return `₦0`;
  const negative = kobo < 0;
  const abs = Math.abs(kobo);
  const naira = Math.floor(abs / 100);
  const koboPart = abs % 100;
  const grouped = naira.toLocaleString("en-NG");
  const base = koboPart === 0 ? `${grouped}` : `${grouped}.${String(koboPart).padStart(2, "0")}`;
  return `${negative ? "-" : ""}₦${base}`;
}

/** Compact format for analytics: ₦1.2k, ₦3.4m */
export function formatNairaCompact(kobo: number): string {
  const naira = kobo / 100;
  if (naira >= 1_000_000) return `₦${(naira / 1_000_000).toFixed(1)}m`;
  if (naira >= 10_000) return `₦${Math.round(naira / 1_000)}k`;
  if (naira >= 1_000) return `₦${(naira / 1_000).toFixed(1)}k`;
  return formatNaira(kobo);
}

export function addKobo(...values: number[]): number {
  return values.reduce((sum, v) => sum + Math.round(v), 0);
}

/** Line total: price × quantity in kobo (integer math only). */
export function lineTotal(priceKobo: number, quantity: number): number {
  return Math.round(priceKobo) * Math.max(0, Math.floor(quantity));
}
