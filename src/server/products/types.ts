import type { ObjectId } from "mongodb";

/**
 * Product catalog records are workspace-scoped.
 * Authorization always uses trusted session.workspace.id — never browser input.
 */
export type ProductDocument = {
  _id: ObjectId;
  workspaceId: string;
  name: string;
  sku: string;
  description?: string;
  price: number;
  currency: string;
  unit?: string;
  createdByUserId: string;
  createdAt: Date;
  updatedAt: Date;
};

/** Safe client-facing product shape (no internal auth fields beyond id). */
export type ProductDTO = {
  id: string;
  name: string;
  sku: string;
  description?: string;
  price: number;
  currency: string;
  unit?: string;
  createdAt: string;
  updatedAt: string;
};

export type ProductListResult = {
  items: ProductDTO[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
};
