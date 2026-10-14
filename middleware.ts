import { withAuth } from "next-auth/middleware";

/**
 * Protect dashboard, onboarding and admin at the edge.
 * Final authorization (role, ownership) is enforced server-side in
* route handlers and server components — never trust the client.
*/
export default withAuth({
  pages: { signIn: "/login" },
  callbacks: {
    authorized: ({ token, req }) => {
      const { pathname } = req.nextUrl;
      if (
        pathname.startsWith("/dashboard") ||
        pathname.startsWith("/onboarding") ||
        pathname.startsWith("/admin")
      ) {
        return Boolean(token);
      }
      return true;
    },
  },
});

export const config = {
  matcher: ["/dashboard/:path*", "/onboarding/:path*", "/admin/:path*"],
};
