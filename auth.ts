// E:\trifuzja-mix\auth.ts
import NextAuth from "next-auth";
import type { NextAuthConfig } from "next-auth";
import { authOptions } from "@/lib/authOptions";

export const authConfig = authOptions satisfies NextAuthConfig;

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
