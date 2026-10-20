// Central domain types.
// The database stores these as strings (SQLite dev compatibility;
// PostgreSQL production can optionally migrate them to native enums).

export type Role = "USER" | "ADMIN";

export type BusinessCategory =
  | "FASHION"
  | "BEAUTY"
  | "FOOD"
  | "ELECTRONICS"
  | "RESTAURANT"
  | "SERVICES"
  | "RETAIL"
  | "HEALTH_WELLNESS"
  | "HOME_FURNITURE"
  | "AUTOMOTIVE"
  | "PROFESSIONAL_SERVICES"
  | "OTHER";

export type ProductType = "PRODUCT" | "SERVICE";

export type OrderStatus = "NEW" | "CONTACTED" | "CONFIRMED" | "COMPLETED" | "CANCELLED";

export type Plan = "FREE" | "STARTER" | "PRO";

export type SubscriptionStatus =
  | "ACTIVE"
  | "TRIALING"
  | "PAST_DUE"
  | "CANCELLING"
  | "CANCELLED"
  | "EXPIRED"
  | "INACTIVE";
