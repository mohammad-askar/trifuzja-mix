// E:\trifuzja-mix\lib\authOptions.ts
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { MongoDBAdapter } from "@next-auth/mongodb-adapter";
import clientPromise from "@/types/mongodb";
import * as bcrypt from "bcryptjs";
import { z } from "zod";

const credsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const authOptions: NextAuthOptions = {
  adapter: MongoDBAdapter(clientPromise),
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(rawCreds) {
        const parsed = credsSchema.safeParse(rawCreds);
        if (!parsed.success) throw new Error("البيانات غير صالحة");

        const client = await clientPromise;
        const users = client.db("trifuzja").collection("admin");

        const user = await users.findOne({
          email: parsed.data.email.toLowerCase(),
        });
        if (!user) throw new Error("المستخدم غير موجود");

        const ok = await bcrypt.compare(parsed.data.password, user.password);
        if (!ok) throw new Error("كلمة المرور غير صحيحة");

        // تُطابق User بعد الـ augmentation
        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name ?? null,
          role: "admin",
        };
      },
    }),
  ],
  session: { strategy: "jwt" },
callbacks: {
  async jwt({ token, user }) {
    if (user) {
      // id موجود في AdapterUser و User
      if ('id' in user && typeof user.id === 'string') {
        token.id = user.id;
      }
      // role موجودة فقط في User (بعد module augmentation)
      if ('role' in user && typeof user.role === 'string') {
        token.role = user.role;
      }
    }
    return token;
  },

  async session({ session, token }) {
    if (session.user) {
      if (typeof token.id === 'string')  session.user.id   = token.id;
      if (typeof token.role === 'string') session.user.role = token.role;
    }
    return session;
  },
},

  pages: { signIn: "/login" },
  secret: process.env.NEXTAUTH_SECRET,
};
