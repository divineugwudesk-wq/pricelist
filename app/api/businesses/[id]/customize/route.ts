import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser, UnauthorizedError, ForbiddenError } from "@/lib/server-auth";
import { storeCustomizeSchema } from "@/lib/validation";
import { getActivePlan } from "@/lib/plans";
import { canUseTheme } from "@/lib/plans";
import { getTheme, THEME_LIST } from "@/lib/themes";

/**
 * Store customization: theme, accent color, branding, hero image,
 * description. Theme access is enforced server-side by plan tier.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new UnauthorizedError();

    const business = await prisma.business.findFirst({
      where: { id: params.id, userId: user.id },
      select: { id: true, theme: true, userId: true },
    });
    if (!business) {
      return NextResponse.json({ error: "Business not found." }, { status: 404 });
    }

    const body = await request.json();
    const parsed = storeCustomizeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Please check your customization details." },
        { status: 400 },
      );
    }

    const plan = await getActivePlan(business.userId);
    const data: Record<string, unknown> = {};

    if (parsed.data.theme && parsed.data.theme !== business.theme) {
      const theme = getTheme(parsed.data.theme);
      const tier: "free" | "pro" = theme.tier;
      if (!canUseTheme(plan, tier)) {
        return NextResponse.json(
          {
            error: `${theme.name} is a Pro theme. Upgrade to Pro to unlock all premium themes.`,
            code: "THEME_PRO_ONLY",
          },
          { status: 403 },
        );
      }
      data.theme = parsed.data.theme;
    }
    if (parsed.data.accentColor !== undefined) {
      data.accentColor = parsed.data.accentColor;
    }
    if (parsed.data.showBranding !== undefined) {
      // Removing PRICELIST branding is a Pro feature.
      if (parsed.data.showBranding === false && plan !== "PRO") {
        return NextResponse.json(
          {
            error: "Removing PRICELIST branding is a Pro feature. Upgrade to Pro.",
            code: "BRANDING_PRO_ONLY",
          },
          { status: 403 },
        );
      }
      data.showBranding = parsed.data.showBranding;
    }
    if (parsed.data.description !== undefined) {
      data.description = parsed.data.description;
    }
    if (parsed.data.heroImageUrl !== undefined) {
      if (parsed.data.heroImageUrl && plan !== "PRO") {
        return NextResponse.json(
          {
            error: "Hero/banner images are a Pro feature. Upgrade to Pro.",
            code: "HERO_PRO_ONLY",
          },
          { status: 403 },
        );
      }
      data.heroImageUrl = parsed.data.heroImageUrl;
    }

    const updated = await prisma.business.update({
      where: { id: business.id },
      data,
    });

    return NextResponse.json({ business: updated });
  } catch (error) {
    if (error instanceof UnauthorizedError || error instanceof ForbiddenError) {
      return NextResponse.json({ error: (error as Error).message }, { status: (error as Error & { status?: number }).status ?? 403 });
    }
    console.error("[customize:PATCH]", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}

/** Available themes for the business, with access flags (server-verified). */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const business = await prisma.business.findFirst({
    where: { id: params.id, userId: user.id },
    select: { id: true, userId: true },
  });
  if (!business) {
    return NextResponse.json({ error: "Business not found." }, { status: 404 });
  }
  const plan = await getActivePlan(business.userId);
  return NextResponse.json({
    themes: THEME_LIST.map((t) => ({
      ...t,
      accessible: canUseTheme(plan, t.tier),
    })),
    accents: [],
  });
}
