import type { ObjectId } from "mongodb";

/**
 * Customer records are workspace-scoped.
 * Authorization always uses trusted session.workspace.id — never browser input.
 */
export type CustomerDocument = {
  _id: ObjectId;
  workspaceId: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  address?: string;
  notes?: string;
  createdByUserId: string;
  createdAt: Date;
  updatedAt: Date;
};

/** Safe client-facing customer shape (no internal auth fields beyond id). */
export type CustomerDTO = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  address?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export type CustomerListResult = {
  items: CustomerDTO[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
};
