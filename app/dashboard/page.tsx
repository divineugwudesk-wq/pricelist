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
      orders: { orderBy: { createdAt: "desc" }, take: 5, include: { items: true } },
      products: { orderBy: { createdAt: "desc" }, take: 4 },
      categories: true,
    },
  });

  if (!business) {
    redirect("/onboarding");
  }

  const plan = await getActivePlan(user.id);
  const planDef = PLANS[plan];
  const productCount = await prisma.product.count({
    where: { businessId: business.id },
  });

  return (
    <DashboardLayout
      userName={user.name}
      businessName={business.name}
      storeSlug={business.slug}
    >
      <DashboardClient
        business={business}
        user={user}
        plan={plan}
        planDef={planDef}
        productCount={productCount}
      />
    </DashboardLayout>
  );
}