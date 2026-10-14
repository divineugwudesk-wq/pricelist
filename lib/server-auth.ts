// Server-side auth helpers — authorization is enforced here, never in the client.
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export interface AuthUser {
  id: string;
  name: string | null;
  email: string | null;
  role: "USER" | "ADMIN";
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, role: true, suspended: true },
  });
  if (!user || user.suspended) return null;
  return {
    ...user,
    role: user.role as "USER" | "ADMIN",
  };
}

export async function requireUser(): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) throw new UnauthorizedError("You must be signed in.");
  return user;
}

export async function requireAdmin(): Promise<AuthUser> {
  const user = await requireUser();
  if (user.role !== "ADMIN") throw new ForbiddenError("Admin access required.");
  return user;
}

export class UnauthorizedError extends Error {
  status = 401;
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends Error {
  status = 403;
  constructor(message = "Forbidden") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export class NotFoundError extends Error {
  status = 404;
  constructor(message = "Not found") {
    super(message);
    this.name = "NotFoundError";
  }
}

/**
 * Load a business scoped to the current user. Never trust a client-supplied
 * business/product id — always resolve it against the session user.
 */
export async function getOwnedBusiness(userId: string, businessId: string) {
  return prisma.business.findFirst({ where: { id: businessId, userId } });
}

export async function getOwnedProduct(userId: string, productId: string) {
  return prisma.product.findFirst({
    where: { id: productId, business: { userId } },
  });
}

export async function getOwnedOrder(userId: string, orderId: string) {
  return prisma.order.findFirst({
    where: { id: orderId, business: { userId } },
  });
}
