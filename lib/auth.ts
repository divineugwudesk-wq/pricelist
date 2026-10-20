// NextAuth configuration — credentials provider with JWT sessions.
// Phone auth can be added as an additional provider without schema changes.

import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { checkRateLimit, addressFromHeaders } from "@/lib/rate-limit";

/**
 * A hash of a value nobody knows, used to spend the same time on a failed
 * lookup as on a failed comparison. It is not a credential for any account.
 */
const DUMMY_HASH = "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy";

/** The client address behind a sign-in attempt, when it can be determined. */
function readClientAddress(req: unknown): string {
  const headers = (req as { headers?: unknown } | undefined)?.headers;
  if (!headers || typeof headers !== "object") return "unknown";
  return addressFromHeaders(headers as Record<string, string>);
}

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name: string | null;
      email: string | null;
      role: "USER" | "ADMIN";
      /** The session version the token was issued with. */
      sessionVersion?: number;
    };
  }

  interface User {
    id: string;
    name: string | null;
    email: string | null;
    role: "USER" | "ADMIN";
    suspended: boolean;
    sessionVersion?: number;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: "USER" | "ADMIN";
    suspended?: boolean;
    sessionVersion?: number;
  }
}

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: "/login", error: "/login" },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials.password) return null;
        const email = credentials.email.trim().toLowerCase();

        // Sign-in is limited per address and per client. Without this, a
        // leaked or guessed password can be tried at a high rate.
        const address = readClientAddress(req);
        const limited = await checkRateLimit("auth", `${address}|${email}`);
        if (!limited.ok) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || user.suspended) {
          // Spend the same work on a missing account as on a wrong password
          // so the response time does not reveal which it was.
          await bcrypt.compare(credentials.password, DUMMY_HASH);
          return null;
        }
        const valid = await bcrypt.compare(credentials.password, user.password);
        if (!valid) return null;
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role as "USER" | "ADMIN",
          suspended: user.suspended,
          sessionVersion: user.sessionVersion,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role as "USER" | "ADMIN";
        token.suspended = user.suspended;
        token.sessionVersion = user.sessionVersion ?? 0;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = (token.role ?? "USER") as "USER" | "ADMIN";
        session.user.sessionVersion = token.sessionVersion ?? 0;
      }
      return session;
    },
  },
  secret: process.env.AUTH_SECRET,
};

/** Hash a password for storage. */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

/** Verify a password against its hash. */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
