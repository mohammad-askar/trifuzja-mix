// types/next-auth.d.ts
import type { DefaultSession } from "next-auth";

export type Role = "admin";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      role: Role; // ✅ غير اختياري
    };
  }

  interface User {
    id: string;
    role: Role; // ✅ غير اختياري
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role: Role; // ✅ غير اختياري
  }
}
