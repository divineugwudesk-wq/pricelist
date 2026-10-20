import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser, UnauthorizedError } from "@/lib/server-auth";
import { businessSchema, businessHoursSchema } from "@/lib/validation";
import { uniqueSlug, isReservedSlug } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) throw new UnauthorizedError();
    const business = await prisma.business.findUnique({
      where: { userId: user.id },
      include: { hours: { orderBy: { day: "asc" } } },
    });
    return NextResponse.json({ business });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("[businesses:GET]", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}

const DEFAULT_HOURS = [
  { day: 0, isOpen: true, opensAt: "09:00", closesAt: "18:00" },
  { day: 1, isOpen: true, opensAt: "09:00", closesAt: "18:00" },
  { day: 2, isOpen: true, opensAt: "09:00", closesAt: "18:00" },
  { day: 3, isOpen: true, opensAt: "09:00", closesAt: "18:00" },
  { day: 4, isOpen: true, opensAt: "09:00", closesAt: "18:00" },
  { day: 5, isOpen: true, opensAt: "09:00", closesAt: "18:00" },
  { day: 6, isOpen: false, opensAt: "10:00", closesAt: "16:00" },
];

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new UnauthorizedError();

    const existing = await prisma.business.findUnique({
      where: { userId: user.id },
    });
    if (existing) {
      return NextResponse.json(
        { error: "You already have a business profile." },
        { status: 409 },
      );
    }

    const body = await request.json();
    const parsed = businessSchema.safeParse(body);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        fieldErrors[issue.path.join(".")] = issue.message;
      }
      return NextResponse.json(
        { error: "Please check the form.", fieldErrors },
        { status: 400 },
      );
    }

    const slugs = await prisma.business.findMany({
      select: { slug: true },
    });
    const slug = uniqueSlug(parsed.data.name, new Set(slugs.map((s) => s.slug)));

    const business = await prisma.business.create({
      data: {
        userId: user.id,
        name: parsed.data.name,
        slug,
        description: parsed.data.description ?? null,
        category: parsed.data.category,
        whatsappNumber: parsed.data.whatsappNumber ?? null,
        phone: parsed.data.phone ?? null,
        address: parsed.data.address ?? null,
        instagram: parsed.data.instagram ?? null,
        tiktok: parsed.data.tiktok ?? null,
        facebook: parsed.data.facebook ?? null,
        x: parsed.data.x ?? null,
        website: parsed.data.website ?? null,
        hours: {
          create: DEFAULT_HOURS.map((h) => ({
            ...h,
            day: h.day,
          })),
        },
      },
    });

    return NextResponse.json({ business }, { status: 201 });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("[businesses:POST]", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new UnauthorizedError();

    const body = await request.json();
    const hours = businessHoursSchema.array().length(7).safeParse(body.hours);
    if (!hours.success) {
      return NextResponse.json(
        { error: "Please provide all 7 days of business hours." },
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

    await prisma.businessHours.deleteMany({ where: { businessId: business.id } });
    await prisma.businessHours.createMany({
      data: hours.data.map((h) => ({ ...h, businessId: business.id })),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("[hours:PUT]", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
