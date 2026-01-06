// 📁 app/api/articles/route.ts
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z, ZodError } from "zod";
import type { Filter } from "mongodb";
import clientPromise from "@/types/mongodb";
import { auth } from "@/auth";

/* ------------------------------------------------------------------ */
/*                               Types                                */
/* ------------------------------------------------------------------ */

interface CoverPos {
  x: number;
  y: number;
}

interface ArticleMeta {
  coverPosition?: CoverPos | "top" | "center" | "bottom";
  [key: string]: unknown;
}

/** مستند المقال (بولندي فقط + دائمًا منشور) */
export interface ArticleDoc {
  _id?: string;
  slug: string;
  title: string;
  excerpt?: string;
  content?: string; // HTML
  categoryId?: string;
  coverUrl?: string;
  status?: "published";
  createdAt: Date;
  updatedAt: Date;
  readingTime?: string;
  meta?: ArticleMeta;
}

/* ------------------------------------------------------------------ */
/*                              Helpers                               */
/* ------------------------------------------------------------------ */

function responseError(msg: string, status = 400): NextResponse {
  return NextResponse.json({ error: msg }, { status });
}

const relativeOrAbsoluteUrl = z
  .string()
  .refine(
    (v) => !v || v.startsWith("http://") || v.startsWith("https://") || v.startsWith("/uploads/"),
    "Invalid URL",
  );

/** Remove HTML tags then measure length */
function plainTextLen(html?: string): number {
  if (!html) return 0;
  return html.replace(/<[^>]+>/g, " ").trim().replace(/\s+/g, " ").length;
}

/** Consider content empty if <= 20 chars after stripping tags */
function isEffectivelyEmpty(html?: string): boolean {
  return plainTextLen(html) <= 20;
}

type Role = "admin" | "editor" | "user";

function getUserRole(session: unknown): Role | undefined {
  if (typeof session !== "object" || session === null) return undefined;

  const s = session as { user?: unknown };
  const user = s.user;
  if (typeof user !== "object" || user === null) return undefined;

  const u = user as { role?: unknown };
  return typeof u.role === "string" ? (u.role as Role) : undefined;
}

async function requireAdminOrEditorOr403(): Promise<{ ok: true } | { ok: false; res: NextResponse }> {
  const session = await auth();
  const role = getUserRole(session);

  if (!session?.user || (role !== "admin" && role !== "editor")) {
    return { ok: false, res: responseError("Unauthorized", 403) };
  }
  return { ok: true };
}

/* ------------------------------------------------------------------ */
/*                               GET (list)                           */
/* ------------------------------------------------------------------ */
/**
 * Supported query params:
 * - ?pageNo=1&limit=9
 * - ?cat=catId  or ?cat=cat1,cat2  or repeated ?cat=...
 * - ?search=foo  (case-insensitive match on title or slug)
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const SearchSchema = z.object({
      pageNo: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(50).default(9),
      // NOTE: we read `search` manually below, because Object.fromEntries drops duplicate keys (cat)
    });

    const rawParams = Object.fromEntries(req.nextUrl.searchParams);
    const qp = SearchSchema.parse(rawParams);

    // categories: allow multiples
    const catsArray = req.nextUrl.searchParams
      .getAll("cat")
      .flatMap((v) => v.split(",").map((s) => s.trim()).filter(Boolean));

    // search term
    const searchRaw = (req.nextUrl.searchParams.get("search") ?? "").trim();

    const escapeRegExp = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    // Only published (or legacy docs without status)
    const filter: Filter<ArticleDoc> = {
      $or: [{ status: "published" }, { status: { $exists: false } }],
    };

    // categories
    if (catsArray.length === 1) {
      filter.categoryId = catsArray[0];
    } else if (catsArray.length > 1) {
      filter.categoryId = { $in: catsArray };
    }

    // apply search on title OR slug (case-insensitive)
    if (searchRaw.length > 0) {
      const rx = new RegExp(escapeRegExp(searchRaw), "i");

      const f = filter as unknown as { $and?: Array<Record<string, unknown>> };
      f.$and = [...(f.$and ?? []), { $or: [{ title: rx }, { slug: rx }] }];
    }

    const db = (await clientPromise).db();
    const coll = db.collection<ArticleDoc>("articles");

    const skip = (qp.pageNo - 1) * qp.limit;

    const cursor = coll
      .find(filter, {
        projection: {
          slug: 1,
          title: 1,
          excerpt: 1,
          categoryId: 1,
          coverUrl: 1,
          status: 1,
          createdAt: 1,
          updatedAt: 1,
          readingTime: 1,
          "meta.coverPosition": 1,
        },
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(qp.limit);

    const docs = await cursor.toArray();
    const total = await coll.countDocuments(filter);

    const articles = docs.map((d) => ({
      _id: d._id?.toString(),
      slug: d.slug,
      title: d.title,
      excerpt: d.excerpt ?? "",
      categoryId: d.categoryId,
      coverUrl: d.coverUrl,
      status: d.status,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
      readingTime: d.readingTime,
      meta: d.meta?.coverPosition ? { coverPosition: d.meta.coverPosition } : undefined,
    }));

    const res = NextResponse.json({
      articles,
      total,
      pageNo: qp.pageNo,
      limit: qp.limit,
      pages: Math.ceil(total / qp.limit),
    });

    res.headers.set("Cache-Control", "s-maxage=60, stale-while-revalidate=30");
    return res;
  } catch (err: unknown) {
    if (err instanceof ZodError) {
      return responseError(err.issues.map((i) => i.message).join(" | "));
    }
    console.error("GET /api/articles", err);
    return responseError("Server error", 500);
  }
}

/* ------------------------------------------------------------------ */
/*                              POST (create)                         */
/* ------------------------------------------------------------------ */
/** Create a single-language article and publish immediately (status='published'). */
const ArticleSchema = z.object({
  title: z.string().trim().min(1),
  excerpt: z.string().trim().optional(),
  content: z.string().trim().optional(), // HTML
  slug: z.string().trim().min(3),
  categoryId: z.string().trim().min(1),
  coverUrl: relativeOrAbsoluteUrl.optional(),
  meta: z
    .object({
      coverPosition: z
        .union([z.object({ x: z.number(), y: z.number() }), z.enum(["top", "center", "bottom"])])
        .optional(),
    })
    .passthrough()
    .optional(),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const guard = await requireAdminOrEditorOr403();
    if (!guard.ok) return guard.res;

    const parsed = ArticleSchema.parse(await req.json());

    // require meaningful content
    if (isEffectivelyEmpty(parsed.content)) {
      return responseError("Content is required", 400);
    }

    const db = (await clientPromise).db();
    const coll = db.collection<ArticleDoc>("articles");

    // slug must be unique
    const dup = await coll.findOne({ slug: parsed.slug }, { projection: { _id: 1 } });
    if (dup) return responseError("Slug already exists", 409);

    const now = new Date();

    // compute reading time
    const html = parsed.content ?? "";
    const words = html.replace(/<[^>]+>/g, " ").trim().split(/\s+/).filter(Boolean).length;
    const minutes = Math.max(1, Math.ceil(words / 200));
    const readingTime = `${minutes} min read`;

    const doc: ArticleDoc = {
      slug: parsed.slug,
      title: parsed.title,
      excerpt: parsed.excerpt,
      content: parsed.content,
      categoryId: parsed.categoryId,
      coverUrl: parsed.coverUrl,
      meta: parsed.meta,
      status: "published",
      createdAt: now,
      updatedAt: now,
      readingTime,
    };

    await coll.insertOne(doc);

    return NextResponse.json({ slug: parsed.slug }, { status: 201 });
  } catch (err: unknown) {
    if (err instanceof ZodError) {
      return responseError(err.issues.map((i) => i.message).join(" | "));
    }
    console.error("POST /api/articles", err);
    return responseError("Server error", 500);
  }
}
