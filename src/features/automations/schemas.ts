import { z } from "zod";

import { PROJECT_STATUSES } from "@/features/projects/schemas";

export const AUTOMATION_TRIGGER_TYPES = [
  "invoice.overdue",
  "payment.received",
  "customer.created",
  "project.status_changed",
] as const;

export type AutomationTriggerType = (typeof AUTOMATION_TRIGGER_TYPES)[number];

export const AUTOMATION_TRIGGER_LABELS: Record<AutomationTriggerType, string> = {
  "invoice.overdue": "Invoice becomes overdue",
  "payment.received": "Payment received",
  "customer.created": "Customer created",
  "project.status_changed": "Project status changes",
};

export const MAX_AUTOMATION_CONDITIONS = 5;
export const MAX_AUTOMATION_ACTIONS = 3;

const currencyValue = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{3}$/, "Use a 3-letter currency code");

const moneyValue = z.coerce.number().finite().nonnegative().max(1_000_000_000);

const notificationTitle = z.string().trim().min(1).max(120);
const notificationMessage = z.string().trim().min(1).max(500);

export const automationTriggerSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("invoice.overdue") }),
  z.object({ type: z.literal("payment.received") }),
  z.object({ type: z.literal("customer.created") }),
  z.object({ type: z.literal("project.status_changed") }),
]);

export const automationConditionSchema = z.discriminatedUnion("field", [
  z.object({
    field: z.literal("invoice.currency"),
    operator: z.literal("equals"),
    value: currencyValue,
  }),
  z.object({
    field: z.literal("invoice.total"),
    operator: z.enum(["greater_than", "less_than"]),
    value: moneyValue,
  }),
  z.object({
    field: z.literal("payment.currency"),
    operator: z.literal("equals"),
    value: currencyValue,
  }),
  z.object({
    field: z.literal("payment.amount"),
    operator: z.literal("greater_than"),
    value: moneyValue,
  }),
  z.object({
    field: z.literal("customer.company"),
    operator: z.literal("exists"),
    value: z.literal(true).default(true),
  }),
  z.object({
    field: z.literal("customer.email"),
    operator: z.literal("exists"),
    value: z.literal(true).default(true),
  }),
  z.object({
    field: z.literal("project.status"),
    operator: z.literal("equals"),
    value: z.enum(PROJECT_STATUSES),
  }),
  z.object({
    field: z.literal("project.previous_status"),
    operator: z.literal("equals"),
    value: z.enum(PROJECT_STATUSES),
  }),
]);

export const automationActionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("notification.create"),
    title: notificationTitle,
    message: notificationMessage,
  }),
]);

export const automationInputSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(120),
    description: z
      .string()
      .trim()
      .max(500)
      .optional()
      .transform((value) => (value && value.length > 0 ? value : undefined)),
    enabled: z.boolean().default(true),
    trigger: automationTriggerSchema,
    conditions: z
      .array(automationConditionSchema)
      .max(MAX_AUTOMATION_CONDITIONS, `At most ${MAX_AUTOMATION_CONDITIONS} conditions`)
      .default([]),
    actions: z
      .array(automationActionSchema)
      .min(1, "Add at least one action")
      .max(MAX_AUTOMATION_ACTIONS, `At most ${MAX_AUTOMATION_ACTIONS} actions`),
  })
  .superRefine((data, ctx) => {
    const allowed = allowedConditionFieldsForTrigger(data.trigger.type);
    for (const [index, condition] of data.conditions.entries()) {
      if (!allowed.includes(condition.field)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Condition field is not valid for this trigger`,
          path: ["conditions", index, "field"],
        });
      }
    }
  });

export type AutomationInput = z.infer<typeof automationInputSchema>;
export type AutomationTrigger = z.infer<typeof automationTriggerSchema>;
export type AutomationCondition = z.infer<typeof automationConditionSchema>;
export type AutomationAction = z.infer<typeof automationActionSchema>;

export const automationListQuerySchema = z.object({
  q: z
    .string()
    .trim()
    .max(100)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined)),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
});

export type AutomationListQuery = z.infer<typeof automationListQuerySchema>;

export function allowedConditionFieldsForTrigger(
  trigger: AutomationTriggerType,
): AutomationCondition["field"][] {
  switch (trigger) {
    case "invoice.overdue":
      return ["invoice.currency", "invoice.total"];
    case "payment.received":
      return ["payment.currency", "payment.amount"];
    case "customer.created":
      return ["customer.company", "customer.email"];
    case "project.status_changed":
      return ["project.status", "project.previous_status"];
    default:
      return [];
  }
}

/** Human-readable summary for forms and detail pages. */
export function summarizeAutomation(input: {
  trigger: AutomationTrigger;
  conditions: AutomationCondition[];
  actions: AutomationAction[];
}): string {
  const triggerLabel = AUTOMATION_TRIGGER_LABELS[input.trigger.type];
  const conditionText =
    input.conditions.length === 0
      ? "with no extra conditions"
      : `if ${input.conditions.map(summarizeCondition).join(" and ")}`;
  const actionText = input.actions.map(summarizeAction).join("; then ");
  return `When ${triggerLabel.toLowerCase()}, ${conditionText}, ${actionText}.`;
}

function summarizeCondition(condition: AutomationCondition): string {
  switch (condition.field) {
    case "invoice.currency":
      return `invoice currency equals ${condition.value}`;
    case "invoice.total":
      return `invoice total is ${condition.operator === "greater_than" ? "greater than" : "less than"} ${condition.value}`;
    case "payment.currency":
      return `payment currency equals ${condition.value}`;
    case "payment.amount":
      return `payment amount is greater than ${condition.value}`;
    case "customer.company":
      return "customer has a company";
    case "customer.email":
      return "customer has an email";
    case "project.status":
      return `new status equals ${condition.value}`;
    case "project.previous_status":
      return `previous status equals ${condition.value}`;
    default:
      return "condition matches";
  }
}

function summarizeAction(action: AutomationAction): string {
  switch (action.type) {
    case "notification.create":
      return `create an internal notification (“${action.title}”)`;
    default:
      return "run an action";
  }
}
