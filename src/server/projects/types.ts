import type { ObjectId } from "mongodb";

import type { ProjectStatus } from "@/features/projects/schemas";

/**
 * Project records are workspace-scoped.
 * Authorization always uses trusted session.workspace.id — never browser input.
 */
export type ProjectDocument = {
  _id: ObjectId;
  workspaceId: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  clientName?: string;
  startDate?: Date;
  dueDate?: Date;
  createdByUserId: string;
  createdAt: Date;
  updatedAt: Date;
};

/** Safe client-facing project shape. Dates are YYYY-MM-DD where present. */
export type ProjectDTO = {
  id: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  clientName?: string;
  startDate?: string;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
};

export type ProjectListResult = {
  items: ProjectDTO[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
};
