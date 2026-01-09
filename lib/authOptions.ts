// lib/authOptions.ts
import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import clientPromise from "@/types/mongodb";
import type { ObjectId } from "mongodb";
import * as bcrypt from "bcryptjs";
import { z } from "zod";


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

export const authOptions: NextAuthConfig = {
  trustHost:
    process.env.AUTH_TRUST_HOST === "true" ||
    process.env.NODE_ENV !== "production",

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
        token.role = "admin"; // ✅ Admin-only system
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user && typeof token.id === "string") {
        session.user.id = token.id;
        session.user.role = "admin"; // ✅ Admin-only system
      }
      return session;
    },
  },
};
