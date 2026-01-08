// types/auth.ts
import { NextResponse } from "next/server";
import { auth } from "@/auth";

export type RequireAdminResult =
  | { ok: true }
  | { ok: false; response: NextResponse };

export async function requireAdmin(): Promise<RequireAdminResult> {
  const session = await auth();

  if (!session?.user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  return { ok: true };
}
