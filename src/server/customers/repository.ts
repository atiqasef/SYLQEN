import "server-only";

import type { UpdateFilter } from "mongodb";
import { ObjectId, type Filter } from "mongodb";

import { getDb } from "@/server/db/mongodb";
import type {
  CustomerDocument,
  CustomerDTO,
} from "@/server/customers/types";

const CUSTOMERS = "customers";

export async function ensureCustomerIndexes() {
  const db = getDb();
  await db.collection(CUSTOMERS).createIndexes([
    {
      key: { workspaceId: 1, createdAt: -1 },
      name: "customers_workspace_createdAt",
    },
    {
      key: { workspaceId: 1, email: 1 },
      unique: true,
      name: "customers_workspace_email_unique",
    },
    {
      key: { workspaceId: 1, name: 1 },
      name: "customers_workspace_name",
    },
  ]);
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function toCustomerDTO(doc: CustomerDocument): CustomerDTO {
  return {
    id: doc._id.toHexString(),
    name: doc.name,
    email: doc.email,
    phone: doc.phone,
    company: doc.company,
    address: doc.address,
    notes: doc.notes,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

export async function insertCustomer(input: {
  workspaceId: string;
  createdByUserId: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  address?: string;
  notes?: string;
}): Promise<CustomerDocument> {
  const db = getDb();
  const now = new Date();
  const doc: CustomerDocument = {
    _id: new ObjectId(),
    workspaceId: input.workspaceId,
    name: input.name,
    email: input.email.toLowerCase(),
    phone: input.phone,
    company: input.company,
    address: input.address,
    notes: input.notes,
    createdByUserId: input.createdByUserId,
    createdAt: now,
    updatedAt: now,
  };

  await db.collection<CustomerDocument>(CUSTOMERS).insertOne(doc);
  return doc;
}

export async function updateCustomerInWorkspace(options: {
  workspaceId: string;
  customerId: string;
  patch: {
    name: string;
    email: string;
    phone?: string;
    company?: string;
    address?: string;
    notes?: string;
  };
}): Promise<CustomerDocument | null> {
  if (!ObjectId.isValid(options.customerId)) {
    return null;
  }

  const db = getDb();
  const $set: Record<string, unknown> = {
    name: options.patch.name,
    email: options.patch.email.toLowerCase(),
    updatedAt: new Date(),
  };
  const $unset: Record<string, ""> = {};

  for (const key of ["phone", "company", "address", "notes"] as const) {
    const value = options.patch[key];
    if (value) {
      $set[key] = value;
    } else {
      $unset[key] = "";
    }
  }

  const update: UpdateFilter<CustomerDocument> = { $set };
  if (Object.keys($unset).length > 0) {
    update.$unset = $unset;
  }

  const result = await db.collection<CustomerDocument>(CUSTOMERS).findOneAndUpdate(
    {
      _id: new ObjectId(options.customerId),
      workspaceId: options.workspaceId,
    },
    update,
    { returnDocument: "after" },
  );

  return result ?? null;
}

export async function findCustomerInWorkspace(options: {
  workspaceId: string;
  customerId: string;
}): Promise<CustomerDocument | null> {
  if (!ObjectId.isValid(options.customerId)) {
    return null;
  }

  const db = getDb();
  return db.collection<CustomerDocument>(CUSTOMERS).findOne({
    _id: new ObjectId(options.customerId),
    workspaceId: options.workspaceId,
  });
}

export async function findCustomerByEmailInWorkspace(options: {
  workspaceId: string;
  email: string;
  excludeCustomerId?: string;
}): Promise<CustomerDocument | null> {
  const db = getDb();
  const filter: Filter<CustomerDocument> = {
    workspaceId: options.workspaceId,
    email: options.email.toLowerCase(),
  };

  if (options.excludeCustomerId && ObjectId.isValid(options.excludeCustomerId)) {
    filter._id = { $ne: new ObjectId(options.excludeCustomerId) };
  }

  return db.collection<CustomerDocument>(CUSTOMERS).findOne(filter);
}

export async function listCustomersInWorkspace(options: {
  workspaceId: string;
  q?: string;
  page: number;
  pageSize: number;
}): Promise<{ items: CustomerDocument[]; total: number }> {
  const db = getDb();
  const filter: Filter<CustomerDocument> = {
    workspaceId: options.workspaceId,
  };

  if (options.q) {
    const pattern = escapeRegex(options.q.slice(0, 100));
    const regex = { $regex: pattern, $options: "i" as const };
    filter.$or = [
      { name: regex },
      { email: regex },
      { company: regex },
      { phone: regex },
    ];
  }

  const collection = db.collection<CustomerDocument>(CUSTOMERS);
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
