// E:\trifuzja-mix\types\next-auth.d.ts
import type { DefaultSession } from "next-auth";

/** النظام عندك Admin فقط */
export type Role = "admin";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      role?: Role; // ✅ اختياري (مهم جداً)
    };
  }

  interface User {
    id: string;
    role?: Role; // ✅ اختياري
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: Role;
  }
}
