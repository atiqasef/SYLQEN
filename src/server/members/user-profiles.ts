import "server-only";

import { ObjectId } from "mongodb";

import { getAuth } from "@/lib/auth";
import { getDb } from "@/server/db/mongodb";

export type AuthUserProfile = {
  id: string;
  name: string;
  email: string;
};

type AuthUserDocument = {
  _id?: ObjectId | string;
  id?: string;
  name?: string | null;
  email?: string | null;
};

/**
 * Resolve public Better Auth identity fields for membership display.
 * Never returns password, session, or credential material.
 */
export async function findAuthUserProfilesByIds(
  userIds: string[],
): Promise<Map<string, AuthUserProfile>> {
  const uniqueIds = [...new Set(userIds.filter(Boolean))];
  const map = new Map<string, AuthUserProfile>();

  if (uniqueIds.length === 0) {
    return map;
  }

  // Prefer Better Auth adapter when available (production path).
  try {
    const auth = getAuth();
    const ctx = await auth.$context;
    await Promise.all(
      uniqueIds.map(async (userId) => {
        const user = await ctx.internalAdapter.findUserById(userId);
        if (!user) {
          return;
        }
        map.set(userId, {
          id: user.id,
          name: user.name?.trim() || user.email || "Member",
          email: user.email ?? "",
        });
      }),
    );
  } catch {
    // Fall through to direct collection lookup (tests / cold adapter).
  }

  const missing = uniqueIds.filter((id) => !map.has(id));
  if (missing.length === 0) {
    return map;
  }

  const db = getDb();
  const objectIds = missing
    .filter((id) => ObjectId.isValid(id))
    .map((id) => new ObjectId(id));

  const docs = await db
    .collection<AuthUserDocument>("user")
    .find({
      $or: [
        { id: { $in: missing } },
        ...(objectIds.length > 0 ? [{ _id: { $in: objectIds } }] : []),
      ],
    })
    .project({ id: 1, name: 1, email: 1, _id: 1 })
    .toArray();

  for (const doc of docs) {
    const id =
      (typeof doc.id === "string" && doc.id) ||
      (doc._id instanceof ObjectId ? doc._id.toHexString() : String(doc._id ?? ""));
    if (!id || map.has(id)) {
      continue;
    }
    map.set(id, {
      id,
      name: doc.name?.trim() || doc.email || "Member",
      email: doc.email ?? "",
    });
  }

  return map;
}
