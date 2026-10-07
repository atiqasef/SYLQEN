import type { ObjectId } from "mongodb";

import type {
  AutomationAction,
  AutomationCondition,
  AutomationTrigger,
  AutomationTriggerType,
} from "@/features/automations/schemas";

export type AutomationDocument = {
  _id: ObjectId;
  workspaceId: string;
  name: string;
  description?: string;
  enabled: boolean;
  trigger: AutomationTrigger;
  conditions: AutomationCondition[];
  actions: AutomationAction[];
  createdByUserId: string;
  createdAt: Date;
  updatedAt: Date;
  lastRunAt?: Date;
  lastRunStatus?: AutomationExecutionStatus;
};

export type AutomationDTO = {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  trigger: AutomationTrigger;
  conditions: AutomationCondition[];
  actions: AutomationAction[];
  createdAt: string;
  updatedAt: string;
  lastRunAt?: string;
  lastRunStatus?: AutomationExecutionStatus;
  summary: string;
};

export type AutomationListResult = {
  items: AutomationDTO[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
};

export type AutomationExecutionStatus = "success" | "failed" | "skipped";

export type AutomationExecutionDocument = {
  _id: ObjectId;
  workspaceId: string;
  automationId: string;
  automationNameSnapshot: string;
  triggerType: AutomationTriggerType;
  eventKey: string;
  status: AutomationExecutionStatus;
  startedAt: Date;
  completedAt: Date;
  errorMessage?: string;
  actionSummaries: string[];
  createdAt: Date;
};

export type AutomationExecutionDTO = {
  id: string;
  automationId: string;
  automationNameSnapshot: string;
  triggerType: AutomationTriggerType;
  eventKey: string;
  status: AutomationExecutionStatus;
  startedAt: string;
  completedAt: string;
  errorMessage?: string;
  actionSummaries: string[];
  createdAt: string;
};

export type AutomationNotificationDocument = {
  _id: ObjectId;
  workspaceId: string;
  automationId: string;
  automationNameSnapshot: string;
  title: string;
  message: string;
  triggerType: AutomationTriggerType;
  eventKey: string;
  createdAt: Date;
};

export type AutomationNotificationDTO = {
  id: string;
  automationId: string;
  automationNameSnapshot: string;
  title: string;
  message: string;
  triggerType: AutomationTriggerType;
  eventKey: string;
  createdAt: string;
};

/** Internal event context for condition evaluation — no secrets. */
export type AutomationEventContext = {
  type: AutomationTriggerType;
  workspaceId: string;
  eventKey: string;
  occurredAt: Date;
  invoice?: {
    id: string;
    invoiceNumber: string;
    currency: string;
    total: number;
    dueDate: string;
    status: string;
  };
  payment?: {
    id: string;
    amount: number;
    currency: string;
    invoiceId: string;
  };
  customer?: {
    id: string;
    name: string;
    email: string;
    company?: string;
  };
  project?: {
    id: string;
    name: string;
    status: string;
    previousStatus: string;
  };
};
