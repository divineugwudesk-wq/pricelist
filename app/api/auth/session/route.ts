import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Session info for client-side bootstrapping (role check is re-verified server-side). */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return Response.json({ user: null });
  }
  return Response.json({
    user: {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      role: session.user.role,
    },
  });
}
