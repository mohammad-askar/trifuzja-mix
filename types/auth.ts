// types/auth.ts
import { NextResponse } from "next/server";
import { auth } from "@/auth";

export type Role = "admin";

export type RequireAdminResult =
  | { ok: true }
  | { ok: false; response: NextResponse };

function isAdminRole(value: unknown): value is Role {
  return value === "admin";
}

function getRole(session: unknown): Role | undefined {
  if (typeof session !== "object" || session === null) return undefined;
  if (!("user" in session)) return undefined;

  const s = session as Record<string, unknown>;
  const user = s.user;

  if (typeof user !== "object" || user === null) return undefined;
  if (!("role" in user)) return undefined;

  const u = user as Record<string, unknown>;
  return isAdminRole(u.role) ? u.role : undefined;
}

export async function requireAdmin(): Promise<RequireAdminResult> {
  const session = await auth();

  if (!session?.user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const role = getRole(session);
  if (role !== "admin") {
    return {
      ok: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { ok: true };
}
