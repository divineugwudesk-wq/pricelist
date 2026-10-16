import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, getCurrentUser } from "@/lib/server-auth";
import { prisma } from "@/lib/db";
import { PLANS, getMRRKobo, getPlanCounts } from "@/lib/plans";
import { rangeForDays } from "@/lib/analytics";
import type { Plan, Role } from "@/lib/db-types";

export const dynamic = "force-dynamic";

/** Platform-wide statistics. */
export async function GET() {
  try {
    await requireAdmin();

    const [
      userCount,
      businessCount,
      newUsers7d,
      mrrKobo,
      planCounts,
      orderAgg,
      events,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.business.count({ where: { suspended: false } }),
      prisma.user.count({
        where: { createdAt: { gte: rangeForDays(7).from } },
      }),
      getMRRKobo(),
      getPlanCounts(),
      prisma.order.aggregate({
        where: { NOT: { status: "CANCELLED" } },
        _sum: { total: true },
        _count: true,
      }),
      prisma.analyticsEvent.groupBy({
        by: ["eventType"],
        _count: { _all: true },
      }),
    ]);

    const eventCounts: Record<string, number> = {};
    for (const e of events) eventCounts[e.eventType] = e._count._all;

    return NextResponse.json({
      stats: {
        totalUsers: userCount,
        activeBusinesses: businessCount,
        freeUsers: planCounts.FREE,
        starterSubscribers: planCounts.STARTER,
        proSubscribers: planCounts.PRO,
        mrrKobo,
        newRegistrations7d: newUsers7d,
        storeViews: eventCounts.STORE_VIEW ?? 0,
        whatsappOrderClicks: eventCounts.WHATSAPP_CLICK ?? 0,
        totalOrders: orderAgg._count,
        totalOrderValueKobo: orderAgg._sum.total ?? 0,
      },
    });
  } catch (error) {
    const status = (error as Error & { status?: number }).status ?? 500;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Forbidden" },
      { status },
    );
  }
}

/** Suspend or unsuspend a business (admin only). */
export async function PUT(request: NextRequest) {
  try {
    await requireAdmin();
    const body = (await request.json()) as {
      businessId: string;
      suspended: boolean;
    };
    if (!body.businessId) {
      return NextResponse.json({ error: "Business ID required." }, { status: 400 });
    }
    const business = await prisma.business.update({
      where: { id: body.businessId },
      data: { suspended: body.suspended === true },
      select: { id: true, name: true, slug: true, suspended: true },
    });
    return NextResponse.json({ business });
  } catch (error) {
    const status = (error as Error & { status?: number }).status ?? 500;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Forbidden" },
      { status },
    );
  }
}

/** Suspend or unsuspend a user (admin only). */
export async function PATCH(request: NextRequest) {
  try {
    await requireAdmin();
    const body = (await request.json()) as {
      userId: string;
      suspended: boolean;
    };
    if (!body.userId) {
      return NextResponse.json({ error: "User ID required." }, { status: 400 });
    }
    const user = await prisma.user.update({
      where: { id: body.userId },
      data: { suspended: body.suspended === true },
      select: { id: true, name: true, email: true, suspended: true },
    });
    return NextResponse.json({ user });
  } catch (error) {
    const status = (error as Error & { status?: number }).status ?? 500;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Forbidden" },
      { status },
    );
  }
}

/** Search/list users (admin only). */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const body = (await request.json()) as {
      q?: string;
      role?: Role | "ALL";
    };
    const q = (body.q ?? "").trim();
    const users = await prisma.user.findMany({
      where: {
        ...(q
          ? {
              OR: [
                { name: { contains: q } },
                { email: { contains: q } },
              ],
            }
          : {}),
        ...(body.role && body.role !== "ALL" ? { role: body.role } : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        suspended: true,
        createdAt: true,
        business: { select: { name: true, slug: true, suspended: true } },
        subscription: { select: { plan: true, status: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return NextResponse.json({ users });
  } catch (error) {
    const status = (error as Error & { status?: number }).status ?? 500;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Forbidden" },
      { status },
    );
  }
}

/** List businesses and subscriptions (admin only). */
export async function DELETE(request: NextRequest) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") ?? "";

    const businesses = await prisma.business.findMany({
      where: {
        ...(q
          ? {
              OR: [
                { name: { contains: q } },
                { slug: { contains: q } },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        name: true,
        slug: true,
        category: true,
        theme: true,
        suspended: true,
        createdAt: true,
        user: { select: { name: true, email: true } },
        _count: { select: { products: true, orders: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const subscriptions = await prisma.subscription.findMany({
      where: { plan: { in: ["STARTER", "PRO"] as Plan[] } },
      select: {
        plan: true,
        status: true,
        provider: true,
        startDate: true,
        renewalDate: true,
        createdAt: true,
        user: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const recentOrders = await prisma.order.findMany({
      select: {
        id: true,
        customerName: true,
        total: true,
        status: true,
        createdAt: true,
        business: { select: { name: true, slug: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    return NextResponse.json({ businesses, subscriptions, recentOrders });
  } catch (error) {
    const status = (error as Error & { status?: number }).status ?? 500;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Forbidden" },
      { status },
    );
  }
}

void getCurrentUser;
