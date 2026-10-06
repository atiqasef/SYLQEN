import type { ObjectId } from "mongodb";

import type { Role } from "@/server/auth/types";

export type WorkspaceDocument = {
  _id: ObjectId;
  name: string;
  slug: string;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
};

export type MembershipDocument = {
  _id: ObjectId;
  workspaceId: string;
  userId: string;
  role: Role;
  createdAt: Date;
  updatedAt: Date;
};
