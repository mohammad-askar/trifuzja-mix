// components/admin/articles/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import clientPromise from "@/types/mongodb";

export type DeleteResult = { ok: true } | { error: string };

type Role = "admin" | "user" | "editor";

function isRole(value: unknown): value is Role {
  return value === "admin" || value === "user" || value === "editor";
}

function getUserRole(session: unknown): Role | undefined {
  if (typeof session !== "object" || session === null) return undefined;

  const s = session as { user?: unknown };
  const user = s.user;
  if (typeof user !== "object" || user === null) return undefined;

  const u = user as { role?: unknown };
  return isRole(u.role) ? u.role : undefined;
}

function revalidateAdminArticlesList(): void {
  revalidatePath("/en/admin/articles", "page");
  revalidatePath("/pl/admin/articles", "page");
}

export async function deleteArticle(slug: string): Promise<DeleteResult> {
  const session = await auth();
  const role = getUserRole(session);

  if (!session?.user || role !== "admin") {
    return { error: "Unauthorized" };
  }

  try {
    const decodedSlug = decodeURIComponent(slug);
    const db = (await clientPromise).db();

    const res = await db
      .collection<{ slug: string }>("articles")
      .deleteOne({ slug: decodedSlug });

    if (res.deletedCount === 0) return { error: "Not found" };

    revalidateAdminArticlesList();
    return { ok: true };
  } catch (e: unknown) {
    console.error("deleteArticle action error:", e);
    return { error: "Server error" };
  }
}
