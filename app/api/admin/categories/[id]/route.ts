// 📁 app/api/admin/categories/[id]/route.ts
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import clientPromise from "@/types/mongodb";
import { requireAdmin } from "@/types/auth";
import slugify from "slugify";
import { z, ZodError } from "zod";

/* ------------------------------- Types -------------------------------- */
type Ctx = { params: Promise<{ id: string }> };

interface CategoryDbDoc {
  _id: ObjectId;
  name: string | Record<string, unknown>;
  slug?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface CategoryApiDoc {
  _id: string;
  name: string;
  slug?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

/* ------------------------------ Schemas ------------------------------- */
const UpdateSchema = z.object({
  name: z.string().trim().min(2, "name must be at least 2 characters"),
});

/* ------------------------------ Helpers ------------------------------- */
function responseError(msg: string, status = 400): NextResponse {
  return NextResponse.json({ error: msg }, { status });
}

function parseObjectId(id: string): ObjectId | null {
  return ObjectId.isValid(id) ? new ObjectId(id) : null;
}

/* -------------------------------- DELETE ------------------------------ */
export async function DELETE(_req: NextRequest, ctx: Ctx): Promise<NextResponse> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const { id } = await ctx.params;
  const oid = parseObjectId(id);
  if (!oid) return responseError("Invalid id format", 400);

  try {
    const db = (await clientPromise).db();
    const res = await db.collection<CategoryDbDoc>("categories").deleteOne({ _id: oid });

    if (res.deletedCount === 0) return responseError("Category not found", 404);

    return new NextResponse(null, { status: 204 });
  } catch (e: unknown) {
    console.error("DELETE category error", e);
    return responseError("Server error", 500);
  }
}

/* ---------------------------------- PUT ------------------------------- */
export async function PUT(req: NextRequest, ctx: Ctx): Promise<NextResponse> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const { id } = await ctx.params;
  const oid = parseObjectId(id);
  if (!oid) return responseError("Invalid id format", 400);

  let name: string;
  try {
    const bodyUnknown: unknown = await req.json();
    ({ name } = UpdateSchema.parse(bodyUnknown));
  } catch (e: unknown) {
    if (e instanceof ZodError) {
      return responseError(e.issues.map((i) => i.message).join(" | "), 400);
    }
    return responseError("Invalid JSON or body", 400);
  }

  try {
    const slug = slugify(name, { lower: true, strict: true });
    const now = new Date();

    const db = (await clientPromise).db();
    const coll = db.collection<CategoryDbDoc>("categories");

    const dup = await coll.findOne({ slug, _id: { $ne: oid } }, { projection: { _id: 1 } });
    if (dup) return responseError("Slug exists", 409);

    // ✅ updateOne ثم findOne لتفادي null typing + أوضح
    const updateRes = await coll.updateOne({ _id: oid }, { $set: { name, slug, updatedAt: now } });
    if (updateRes.matchedCount === 0) return responseError("Category not found", 404);

    const updated = await coll.findOne({ _id: oid });
    if (!updated) return responseError("Category not found", 404);

    const out: CategoryApiDoc = {
      _id: updated._id.toString(),
      name: typeof updated.name === "string" ? updated.name : name,
      slug: updated.slug,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };

    return NextResponse.json(out, { status: 200 });
  } catch (e: unknown) {
    console.error("PUT category error", e);
    return responseError("Server error", 500);
  }
}
