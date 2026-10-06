import "server-only";

import type { UpdateFilter } from "mongodb";
import { ObjectId, type Filter } from "mongodb";

import { getDb } from "@/server/db/mongodb";
import type { ProductDocument, ProductDTO } from "@/server/products/types";

const PRODUCTS = "products";

/**
 * Process-scoped ensure: createIndexes runs at most once per warm runtime.
 * Failures clear the promise so the next call can retry.
 */
let productIndexesPromise: Promise<void> | undefined;

async function createProductIndexes() {
  const db = getDb();
  await db.collection(PRODUCTS).createIndexes([
    {
      key: { workspaceId: 1, createdAt: -1 },
      name: "products_workspace_createdAt",
    },
    {
      key: { workspaceId: 1, sku: 1 },
      unique: true,
      name: "products_workspace_sku_unique",
    },
    {
      key: { workspaceId: 1, name: 1 },
      name: "products_workspace_name",
    },
  ]);
}

export async function ensureProductIndexes() {
  if (!productIndexesPromise) {
    productIndexesPromise = createProductIndexes().catch((error: unknown) => {
      productIndexesPromise = undefined;
      throw error;
    });
  }

  return productIndexesPromise;
}

/** Test helper — clear the process-level index ensure guard. */
export function resetProductIndexesForTests() {
  productIndexesPromise = undefined;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function toProductDTO(doc: ProductDocument): ProductDTO {
  return {
    id: doc._id.toHexString(),
    name: doc.name,
    sku: doc.sku,
    description: doc.description,
    price: doc.price,
    currency: doc.currency,
    unit: doc.unit,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

export async function insertProduct(input: {
  workspaceId: string;
  createdByUserId: string;
  name: string;
  sku: string;
  description?: string;
  price: number;
  currency: string;
  unit?: string;
}): Promise<ProductDocument> {
  const db = getDb();
  const now = new Date();
  const doc: ProductDocument = {
    _id: new ObjectId(),
    workspaceId: input.workspaceId,
    name: input.name,
    sku: input.sku,
    description: input.description,
    price: input.price,
    currency: input.currency,
    unit: input.unit,
    createdByUserId: input.createdByUserId,
    createdAt: now,
    updatedAt: now,
  };

  await db.collection<ProductDocument>(PRODUCTS).insertOne(doc);
  return doc;
}

export async function updateProductInWorkspace(options: {
  workspaceId: string;
  productId: string;
  patch: {
    name: string;
    sku: string;
    description?: string;
    price: number;
    currency: string;
    unit?: string;
  };
}): Promise<ProductDocument | null> {
  if (!ObjectId.isValid(options.productId)) {
    return null;
  }

  const db = getDb();
  const $set: Record<string, unknown> = {
    name: options.patch.name,
    sku: options.patch.sku,
    price: options.patch.price,
    currency: options.patch.currency,
    updatedAt: new Date(),
  };
  const $unset: Record<string, ""> = {};

  for (const key of ["description", "unit"] as const) {
    const value = options.patch[key];
    if (value) {
      $set[key] = value;
    } else {
      $unset[key] = "";
    }
  }

  const update: UpdateFilter<ProductDocument> = { $set };
  if (Object.keys($unset).length > 0) {
    update.$unset = $unset;
  }

  const result = await db.collection<ProductDocument>(PRODUCTS).findOneAndUpdate(
    {
      _id: new ObjectId(options.productId),
      workspaceId: options.workspaceId,
    },
    update,
    { returnDocument: "after" },
  );

  return result ?? null;
}

export async function findProductInWorkspace(options: {
  workspaceId: string;
  productId: string;
}): Promise<ProductDocument | null> {
  if (!ObjectId.isValid(options.productId)) {
    return null;
  }

  const db = getDb();
  return db.collection<ProductDocument>(PRODUCTS).findOne({
    _id: new ObjectId(options.productId),
    workspaceId: options.workspaceId,
  });
}

export async function findProductBySkuInWorkspace(options: {
  workspaceId: string;
  sku: string;
  excludeProductId?: string;
}): Promise<ProductDocument | null> {
  const db = getDb();
  const filter: Filter<ProductDocument> = {
    workspaceId: options.workspaceId,
    sku: options.sku,
  };

  if (options.excludeProductId && ObjectId.isValid(options.excludeProductId)) {
    filter._id = { $ne: new ObjectId(options.excludeProductId) };
  }

  return db.collection<ProductDocument>(PRODUCTS).findOne(filter);
}

/** Resolve multiple products in one workspace-scoped query. */
export async function findProductsByIdsInWorkspace(options: {
  workspaceId: string;
  productIds: string[];
}): Promise<ProductDocument[]> {
  const objectIds = options.productIds
    .filter((id) => ObjectId.isValid(id))
    .map((id) => new ObjectId(id));

  if (objectIds.length === 0) {
    return [];
  }

  const db = getDb();
  return db
    .collection<ProductDocument>(PRODUCTS)
    .find({
      workspaceId: options.workspaceId,
      _id: { $in: objectIds },
    })
    .toArray();
}

export async function listProductsInWorkspace(options: {
  workspaceId: string;
  q?: string;
  page: number;
  pageSize: number;
}): Promise<{ items: ProductDocument[]; total: number }> {
  const db = getDb();
  const filter: Filter<ProductDocument> = {
    workspaceId: options.workspaceId,
  };

  if (options.q) {
    const pattern = escapeRegex(options.q.slice(0, 100));
    const regex = { $regex: pattern, $options: "i" as const };
    filter.$or = [{ name: regex }, { sku: regex }, { description: regex }];
  }

  const collection = db.collection<ProductDocument>(PRODUCTS);
  const skip = (options.page - 1) * options.pageSize;

  const [items, total] = await Promise.all([
    collection
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(options.pageSize)
      .toArray(),
    collection.countDocuments(filter),
  ]);

  return { items, total };
}
