// 📁 app/api/admin/categories/route.ts
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/types/auth";
import clientPromise from "@/types/mongodb";
import slugify from "slugify";
import { z, ZodError } from "zod";

/* --------------------------- Types --------------------------- */
import type { ObjectId } from "mongodb";

interface CategoryBase {
  // قد تكون string (جديدة) أو {en,pl} (قديمة) — نطبّع عند القراءة
  name: unknown;
  slug?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// للقراءة من DB (Mongo دائمًا يضع _id)
type CategoryDbDoc = CategoryBase & { _id: ObjectId };

// للإدخال (نترك _id اختياري لأنه يُنشأ تلقائيًا)
type CategoryInsertDoc = CategoryBase & { _id?: ObjectId };

interface CategoryAdminApiDoc {
  _id: string;
  name: string; // دائمًا بولندي (أو fallback)
  slug?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

type CategoryAggOut = CategoryDbDoc & { effectiveTS?: Date };

/* -------------------------- Helpers -------------------------- */
function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

/** استخراج البولندية ثم الإنجليزية ثم أول قيمة نصية متاحة */
function normalizeNameToPolish(input: unknown): string {
  if (typeof input === "string") return input.trim();
  if (isRecord(input)) {
    const pl = typeof input.pl === "string" ? input.pl.trim() : "";
    if (pl) return pl;

    const en = typeof input.en === "string" ? input.en.trim() : "";
    if (en) return en;

    const first = Object.values(input).find(
      (v): v is string => typeof v === "string" && v.trim().length > 0,
    );
    return (first ?? "").trim();
  }
  return "";
}

/* --------------------------- Zod Schemas --------------------------- */
const CategoryCreateInput = z.object({
  name: z.string().trim().min(2, "name must be at least 2 characters"),
});

/* -------------------------------- GET ------------------------------ */
export async function GET(): Promise<NextResponse> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  try {
    const db = (await clientPromise).db();

    const docs = await db
      .collection<CategoryDbDoc>("categories")
      .aggregate<CategoryAggOut>([
        {
          $project: {
            name: 1,
            slug: 1,
            createdAt: 1,
            updatedAt: 1,
            effectiveTS: {
              $ifNull: ["$updatedAt", { $ifNull: ["$createdAt", { $toDate: "$_id" }] }],
            },
          },
        },
        { $sort: { effectiveTS: -1, _id: -1 } },
      ])
      .toArray();

    const cats: CategoryAdminApiDoc[] = docs.map((c) => ({
      _id: c._id.toString(),
      name: normalizeNameToPolish(c.name),
      slug: c.slug,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }));

    return NextResponse.json(cats, { status: 200 });
  } catch (e: unknown) {
    console.error("GET categories error", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/* -------------------------------- POST ----------------------------- */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  try {
    const parsed = CategoryCreateInput.parse(await req.json());

    const name = parsed.name.trim();
    const slug = slugify(name, { lower: true, strict: true });
    const now = new Date();

    const db = (await clientPromise).db();

    // فحص التكرار (نستخدم Type الإدخال/القراءة لا يفرق هنا)
    const dup = await db
      .collection<CategoryDbDoc>("categories")
      .findOne({ slug }, { projection: { _id: 1 } });

    if (dup) {
      return NextResponse.json({ error: "Slug exists" }, { status: 409 });
    }

    // ✅ إدخال بدون _id
    const doc: CategoryInsertDoc = {
      name,
      slug,
      createdAt: now,
      updatedAt: now,
    };

    // ✅ هنا نستخدم collection<CategoryInsertDoc> لتوافق typings عندك
    const { insertedId } = await db.collection<CategoryInsertDoc>("categories").insertOne(doc);

    return NextResponse.json(
      { ...doc, _id: insertedId.toString() },
      { status: 201 },
    );
  } catch (e: unknown) {
    if (e instanceof ZodError) {
      return NextResponse.json(
        { error: e.issues.map((i) => i.message).join(" | ") },
        { status: 400 },
      );
    }
    console.error("POST categories error", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
