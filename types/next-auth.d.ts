// types/next-auth.d.ts
import type { DefaultSession } from "next-auth";

/** النظام Admin فقط */
export type Role = "admin";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      role?: Role; // ✅ لازم تبقى اختيارية لتفادي كسر AdapterUser
    };
  }

  interface User {
    id: string;
    role?: Role; // ✅ اختيارية
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: Role; // ✅ اختيارية
  }
}
