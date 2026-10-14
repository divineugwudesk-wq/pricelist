// Seed script — realistic demo data for visual testing.
// Run: npm run db:seed
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import type { BusinessCategory } from "@/lib/db-types";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding PRICELIST…");

  // ---- Users ----
  const demoPass = await bcrypt.hash("demo1234", 10);
  const adminPass = await bcrypt.hash("admin1234", 10);

  const demo = await prisma.user.upsert({
    where: { email: "demo@pricelist.ng" },
    update: {},
    create: {
      name: "Chuks Okafor",
      email: "demo@pricelist.ng",
      password: demoPass,
      phone: "0801 234 5678",
      role: "USER",
    },
  });

  const admin = await prisma.user.upsert({
    where: { email: "admin@pricelist.ng" },
    update: {},
    create: {
      name: "PRICELIST Admin",
      email: "admin@pricelist.ng",
      password: adminPass,
      role: "ADMIN",
    },
  });

  // ---- Demo business: Chuks Kicks (Fashion) ----
  const kicks = await prisma.business.upsert({
    where: { slug: "chuks-kicks" },
    update: {},
    create: {
      userId: demo.id,
      name: "Chuks Kicks",
      slug: "chuks-kicks",
      description:
        "Authentic sneakers and streetwear, delivered across Lagos. All products are 100% genuine with receipt.",
      category: "FASHION",
      whatsappNumber: "0801 234 5678",
      phone: "0801 234 5678",
      address: "12 Broad Street, Lagos Island",
      timezone: "Africa/Lagos",
      theme: "classic",
      showBranding: true,
      instagram: "instagram.com/chukskicks",
      tiktok: "tiktok.com/@chukskicks",
    },
  });

  // Hours: Mon–Sat 9:00–19:00, Sunday closed
  await prisma.businessHours.deleteMany({ where: { businessId: kicks.id } });
  await prisma.businessHours.createMany({
    data: [0, 1, 2, 3, 4, 5].map((day) => ({
      businessId: kicks.id,
      day,
      isOpen: true,
      opensAt: "09:00",
      closesAt: "19:00",
    })).concat([{ businessId: kicks.id, day: 6, isOpen: false, opensAt: "10:00", closesAt: "16:00" }]),
  });

  // Categories
  const sneakers = await prisma.category.upsert({
    where: { businessId_name: { businessId: kicks.id, name: "Sneakers" } },
    update: {},
    create: { businessId: kicks.id, name: "Sneakers", sortOrder: 0 },
  });
  const streetwear = await prisma.category.upsert({
    where: { businessId_name: { businessId: kicks.id, name: "Streetwear" } },
    update: {},
    create: { businessId: kicks.id, name: "Streetwear", sortOrder: 1 },
  });
  const accessories = await prisma.category.upsert({
    where: { businessId_name: { businessId: kicks.id, name: "Accessories" } },
    update: {},
    create: { businessId: kicks.id, name: "Accessories", sortOrder: 2 },
  });

  // Products (price in kobo)
  const kicksProducts = [
    { name: "Air Max Sneakers", categoryId: sneakers.id, price: 45_000, salePrice: 38_500, featured: true, desc: "Classic Air Max in white and navy. Genuine leather upper, cushioned sole, sizes 36–46." },
    { name: "Classic White Sneakers", categoryId: sneakers.id, price: 28_500, salePrice: null, featured: true, desc: "Minimal white sneakers that go with everything. Durable rubber sole, easy to clean." },
    { name: "Premium Slides", categoryId: sneakers.id, price: 18_000, salePrice: 14_000, featured: false, desc: "Soft-bed premium slides in black. Available in sizes 38–45." },
    { name: "Streetwear Hoodie", categoryId: streetwear.id, price: 32_000, salePrice: null, featured: true, desc: "Heavyweight 450gsm hoodie, relaxed fit. Charcoal and olive available." },
    { name: "Leather Chelsea Boots", categoryId: sneakers.id, price: 68_000, salePrice: null, featured: false, desc: "Hand-finished leather Chelsea boots. Made to last, sizes 40–46." },
    { name: "Canvas Tote Bag", categoryId: accessories.id, price: 9_500, salePrice: null, featured: false, desc: "Sturdy 16oz canvas tote with inner pocket. Navy, black, olive." },
  ];

  for (const p of kicksProducts) {
    await prisma.product.upsert({
      where: { businessId_slug: { businessId: kicks.id, slug: slugify(p.name) } },
      update: {},
      create: {
        businessId: kicks.id,
        categoryId: p.categoryId,
        name: p.name,
        slug: slugify(p.name),
        description: p.desc,
        price: p.price * 100,
        salePrice: p.salePrice ? p.salePrice * 100 : null,
        type: "PRODUCT",
        sku: `CK-${Math.floor(Math.random() * 9000 + 1000)}`,
        isAvailable: true,
        isFeatured: p.featured,
      },
    });
  }

  // Subscription for demo user
  await prisma.subscription.upsert({
    where: { userId: demo.id },
    update: {},
    create: {
      userId: demo.id,
      plan: "FREE",
      status: "ACTIVE",
      provider: "manual",
      startDate: new Date(),
    },
  });

  // Sample orders for the demo business
  const order1 = await prisma.order.create({
    data: {
      businessId: kicks.id,
      customerName: "David Adeyemi",
      customerPhone: "0703 555 0199",
      customerNote: "Please confirm size 42 availability.",
      subtotal: (38_500 + 32_000) * 100,
      discount: (45_000 - 38_500) * 100,
      total: (38_500 + 32_000) * 100,
      status: "NEW",
      source: "storefront",
    },
  });
  await prisma.orderItem.createMany({
    data: [
      {
        orderId: order1.id,
        productId: (await prisma.product.findFirst({ where: { businessId: kicks.id, name: "Air Max Sneakers" }, select: { id: true } }))!.id,
        productNameSnapshot: "Air Max Sneakers",
        priceSnapshot: 38_500 * 100,
        quantity: 1,
        subtotal: 38_500 * 100,
      },
      {
        orderId: order1.id,
        productId: (await prisma.product.findFirst({ where: { businessId: kicks.id, name: "Streetwear Hoodie" }, select: { id: true } }))!.id,
        productNameSnapshot: "Streetwear Hoodie",
        priceSnapshot: 32_000 * 100,
        quantity: 1,
        subtotal: 32_000 * 100,
      },
    ],
  });

  // ---- Demo business: Ada's Beauty ----
  const ada = await prisma.user.upsert({
    where: { email: "ada@pricelist.ng" },
    update: {},
    create: {
      name: "Ada Nwosu",
      email: "ada@pricelist.ng",
      password: demoPass,
      role: "USER",
    },
  });

  const beauty = await prisma.business.upsert({
    where: { slug: "ada-beauty" },
    update: {},
    create: {
      userId: ada.id,
      name: "Ada's Beauty",
      slug: "ada-beauty",
      description:
        "Premium wigs, closures and professional hair installation. Beauty services by appointment.",
      category: "BEAUTY",
      whatsappNumber: "0803 987 6543",
      phone: "0803 987 6543",
      address: "45 Admiralty Way, Lekki, Lagos",
      timezone: "Africa/Lagos",
      theme: "luxury",
      showBranding: true,
      instagram: "instagram.com/adasbeauty",
    },
  });

  await prisma.businessHours.deleteMany({ where: { businessId: beauty.id } });
  await prisma.businessHours.createMany({
    data: [0, 1, 2, 3, 4, 5].map((day) => ({
      businessId: beauty.id,
      day,
      isOpen: true,
      opensAt: "10:00",
      closesAt: "18:00",
    })).concat([{ businessId: beauty.id, day: 6, isOpen: true, opensAt: "12:00", closesAt: "16:00" }]),
  });

  const wigs = await prisma.category.upsert({
    where: { businessId_name: { businessId: beauty.id, name: "Wigs" } },
    update: {},
    create: { businessId: beauty.id, name: "Wigs", sortOrder: 0 },
  });
  const services = await prisma.category.upsert({
    where: { businessId_name: { businessId: beauty.id, name: "Services" } },
    update: {},
    create: { businessId: beauty.id, name: "Services", sortOrder: 1 },
  });

  const beautyProducts = [
    { name: "Bone Straight Wig", categoryId: wigs.id, price: 85_000, salePrice: 72_000, featured: true, type: "PRODUCT", desc: "100% virgin hair bone straight wig. 16–24 inches, lace front, natural hairline." },
    { name: "Body Wave Wig", categoryId: wigs.id, price: 78_000, salePrice: null, featured: true, type: "PRODUCT", desc: "Soft body wave, 18–26 inches. No shedding, combs beautifully." },
    { name: "Closure (4x4)", categoryId: wigs.id, price: 30_000, salePrice: null, featured: false, type: "PRODUCT", desc: "Swiss lace closure, natural hairline. Blonde and dark shades." },
    { name: "Hair Installation", categoryId: services.id, price: 15_000, salePrice: null, featured: true, type: "SERVICE", desc: "Professional wig installation by Ada. Includes styling, 90 minutes." },
  ];

  for (const p of beautyProducts) {
    await prisma.product.upsert({
      where: { businessId_slug: { businessId: beauty.id, slug: slugify(p.name) } },
      update: {},
      create: {
        businessId: beauty.id,
        categoryId: p.categoryId,
        name: p.name,
        slug: slugify(p.name),
        description: p.desc,
        price: p.price * 100,
        salePrice: p.salePrice ? p.salePrice * 100 : null,
        type: p.type,
        isAvailable: true,
        isFeatured: p.featured,
      },
    });
  }

  await prisma.subscription.upsert({
    where: { userId: ada.id },
    update: {},
    create: { userId: ada.id, plan: "FREE", status: "ACTIVE", provider: "manual", startDate: new Date() },
  });

  // ---- Demo business: Mama T's Kitchen ----
  const mama = await prisma.user.upsert({
    where: { email: "mama@pricelist.ng" },
    update: {},
    create: {
      name: "Mama T",
      email: "mama@pricelist.ng",
      password: demoPass,
      role: "USER",
    },
  });

  const kitchen = await prisma.business.upsert({
    where: { slug: "mama-t-kitchen" },
    update: {},
    create: {
      userId: mama.id,
      name: "Mama T's Kitchen",
      slug: "mama-t-kitchen",
      description:
        "Home-cooked Nigerian food, made fresh daily. Place your order on WhatsApp and pick up or get delivery.",
      category: "RESTAURANT",
      whatsappNumber: "0810 555 1234",
      phone: "0810 555 1234",
      address: "7 Opebi Road, Ikeja, Lagos",
      timezone: "Africa/Lagos",
      theme: "restaurant",
      showBranding: true,
    },
  });

  await prisma.businessHours.deleteMany({ where: { businessId: kitchen.id } });
  await prisma.businessHours.createMany({
    data: [0, 1, 2, 3, 4, 5, 6].map((day) => ({
      businessId: kitchen.id,
      day,
      isOpen: true,
      opensAt: "08:00",
      closesAt: "21:00",
    })),
  });

  const mains = await prisma.category.upsert({
    where: { businessId_name: { businessId: kitchen.id, name: "Mains" } },
    update: {},
    create: { businessId: kitchen.id, name: "Mains", sortOrder: 0 },
  });
  const smallChops = await prisma.category.upsert({
    where: { businessId_name: { businessId: kitchen.id, name: "Small Chops" } },
    update: {},
    create: { businessId: kitchen.id, name: "Small Chops", sortOrder: 1 },
  });

  const kitchenProducts = [
    { name: "Jollof Rice", categoryId: mains.id, price: 3_500, salePrice: null, featured: true, desc: "Party jollof, smoky and rich. Served with chicken and salad." },
    { name: "Fried Rice", categoryId: mains.id, price: 4_000, salePrice: null, featured: false, desc: "Nigerian fried rice with shrimp, chicken and vegetables." },
    { name: "Grilled Chicken", categoryId: mains.id, price: 5_500, salePrice: 4_500, featured: true, desc: "Half chicken, grilled with our secret spice rub." },
    { name: "Small Chops (Party Pack)", categoryId: smallChops.id, price: 6_000, salePrice: null, featured: true, desc: "Puff-puff, spring rolls, samosa and chin-chin. Feeds 4–6." },
  ];

  for (const p of kitchenProducts) {
    await prisma.product.upsert({
      where: { businessId_slug: { businessId: kitchen.id, slug: slugify(p.name) } },
      update: {},
      create: {
        businessId: kitchen.id,
        categoryId: p.categoryId,
        name: p.name,
        slug: slugify(p.name),
        description: p.desc,
        price: p.price * 100,
        salePrice: p.salePrice ? p.salePrice * 100 : null,
        type: "PRODUCT",
        isAvailable: true,
        isFeatured: p.featured,
      },
    });
  }

  await prisma.subscription.upsert({
    where: { userId: mama.id },
    update: {},
    create: { userId: mama.id, plan: "FREE", status: "ACTIVE", provider: "manual", startDate: new Date() },
  });

  // ---- Analytics events for realistic dashboards ----
  const now = Date.now();
  const events = [];
  for (let d = 29; d >= 0; d--) {
    const date = new Date(now - d * 86_400_000);
    const views = Math.floor(20 + Math.random() * 80);
    const clicks = Math.floor(views * (0.08 + Math.random() * 0.1));
    for (let i = 0; i < views; i++) {
      events.push({
        businessId: kicks.id,
        eventType: "STORE_VIEW",
        sessionId: `seed-${d}-${i}`,
        createdAt: date,
      });
    }
    for (let i = 0; i < clicks; i++) {
      events.push({
        businessId: kicks.id,
        eventType: "WHATSAPP_CLICK",
        sessionId: `seed-${d}-c${i}`,
        createdAt: date,
      });
    }
    const prod = await prisma.product.findFirst({ where: { businessId: kicks.id }, select: { id: true } });
    for (let i = 0; i < Math.floor(views * 0.5); i++) {
      events.push({
        businessId: kicks.id,
        eventType: "PRODUCT_VIEW",
        productId: prod?.id ?? null,
        sessionId: `seed-${d}-p${i}`,
        createdAt: date,
      });
    }
  }
  // Chunk inserts (SQLite parameter limit).
  for (let i = 0; i < events.length; i += 500) {
    await prisma.analyticsEvent.createMany({
      data: events.slice(i, i + 500),
    });
  }

  console.log("✅ Seed complete");
  console.log("   Demo owner: demo@pricelist.ng / demo1234");
  console.log("   Admin:      admin@pricelist.ng / admin1234");
  console.log("   Stores:     /chuks-kicks, /ada-beauty, /mama-t-kitchen");
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
