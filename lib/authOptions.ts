// lib/authOptions.ts
import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import clientPromise from "@/types/mongodb";
import type { ObjectId } from "mongodb";
import * as bcrypt from "bcryptjs";
import { z } from "zod";

type Role = "admin";

type DbAdminUser = {
  _id: ObjectId;
  email: string;
  password: string;
  name?: string | null;
};

const credsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

function isRole(value: unknown): value is Role {
  return value === "admin";
}

function getUserRole(user: unknown): Role | undefined {
  if (typeof user !== "object" || user === null) return undefined;
  if (!("role" in user)) return undefined;

  const record = user as Record<string, unknown>;
  return isRole(record.role) ? record.role : undefined;
}

export const authOptions: NextAuthConfig = {
  /**
   * ✅ Fix UntrustedHost
   * - Local/dev: allowed
   * - Prod/Vercel: enable via AUTH_TRUST_HOST=true
   */
  trustHost:
    process.env.AUTH_TRUST_HOST === "true" ||
    process.env.NODE_ENV !== "production",

  /**
   * ✅ Secret (Auth.js v5 prefers AUTH_SECRET)
   * Keep it stable across deployments.
   */
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,

  adapter: MongoDBAdapter(clientPromise),

  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },

      async authorize(rawCreds) {
        const parsed = credsSchema.safeParse(rawCreds);
        if (!parsed.success) return null;

        const client = await clientPromise;
        const users = client.db("trifuzja").collection<DbAdminUser>("admin");

        const user = await users.findOne({
          email: parsed.data.email.toLowerCase(),
        });

        if (!user) return null;

        const ok = await bcrypt.compare(parsed.data.password, user.password);
        if (!ok) return null;

        return {
          id: user._id.toHexString(),
          email: user.email,
          name: user.name ?? null,
          role: "admin" as const,
        };
      },
    }),
  ],

  session: { strategy: "jwt" },

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;

        const role = getUserRole(user);
        if (role) token.role = role;
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user && typeof token.id === "string") {
        session.user.id = token.id;

        if (isRole(token.role)) {
          session.user.role = token.role;
        }
      }
      return session;
    },
  },

  /**
   * ✅ IMPORTANT with locales:
   * Your login page is /en/login
   * If you keep /login here you'll get weird redirects.
   */
  pages: { signIn: "/en/login" },
};
