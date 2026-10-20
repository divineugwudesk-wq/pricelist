import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/server-auth";
import { prisma } from "@/lib/db";
import { getActivePlan, PLANS } from "@/lib/plans";
import { DashboardLayout } from "@/components/dashboard-layout";
import { DashboardClient } from "./dashboard-client";

export default async function DashboardOverview() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const business = await prisma.business.findUnique({
    where: { userId: user.id },
    include: {
      orders: {
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { items: true },
      },
      products: { orderBy: { createdAt: "desc" }, take: 4 },
      categories: true,
    },
  });

  if (!business) {
    redirect("/onboarding");
  }

  const plan = await getActivePlan(user.id);
  const planDef = PLANS[plan];

  // Real totals — the five most recent orders are not the whole history.
  const [productCount, orderCount, revenue, newOrderCount, hiddenProductCount] =
    await Promise.all([
      prisma.product.count({ where: { businessId: business.id } }),
      prisma.order.count({ where: { businessId: business.id } }),
      prisma.order.aggregate({
        where: { businessId: business.id, status: { not: "CANCELLED" } },
        _sum: { total: true },
      }),
      prisma.order.count({ where: { businessId: business.id, status: "NEW" } }),
      prisma.product.count({
        where: { businessId: business.id, isAvailable: false },
      }),
    ]);

  return (
    <DashboardLayout
      userName={user.name}
      businessName={business.name}
      storeSlug={business.slug}
    >
      <DashboardClient
        business={{
          name: business.name,
          slug: business.slug,
          description: business.description,
          whatsappNumber: business.whatsappNumber,
          logoUrl: business.logoUrl,
          orders: business.orders,
          products: business.products,
          categories: business.categories,
        }}
        plan={plan}
        planDef={planDef}
        productCount={productCount}
        orderCount={orderCount}
        revenue={revenue._sum.total ?? 0}
        newOrderCount={newOrderCount}
        hiddenProductCount={hiddenProductCount}
      />
    </DashboardLayout>
  );
}
