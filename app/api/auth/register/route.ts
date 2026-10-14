import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      name?: string;
      email?: string;
      password?: string;
    };
    const name = String(body.name ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");

    if (!name || name.length < 2) {
      return Response.json(
        { error: "Invalid details", message: "Please enter your name." },
        { status: 400 },
      );
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return Response.json(
        { error: "Invalid email", message: "Enter a valid email address." },
        { status: 400 },
      );
    }
    if (password.length < 8) {
      return Response.json(
        {
          error: "Invalid password",
          message: "Password must be at least 8 characters.",
          fieldErrors: { password: "Password must be at least 8 characters." },
        },
        { status: 400 },
      );
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return Response.json(
        {
          error: "Email already registered",
          message: "An account with this email already exists. Try signing in.",
          fieldErrors: { email: "An account with this email already exists." },
        },
        { status: 409 },
      );
    }

    await prisma.user.create({
      data: {
        name,
        email,
        password: await hashPassword(password),
        role: "USER",
      },
    });

    return Response.json({ ok: true }, { status: 201 });
  } catch (error) {
    console.error("[register]", error);
    return Response.json(
      { error: "Something went wrong", message: "Please try again." },
      { status: 500 },
    );
  }
}
