import "server-only";

import { moneyToCents } from "@/features/invoices/money";
import type { AutomationCondition } from "@/features/automations/schemas";
import type { AutomationEventContext } from "@/server/automations/types";

/** Flat AND semantics: every condition must pass. Empty list → true. */
export function evaluateConditions(
  conditions: AutomationCondition[],
  context: AutomationEventContext,
): boolean {
  if (conditions.length === 0) {
    return true;
  }
  return conditions.every((condition) => evaluateCondition(condition, context));
}

export function evaluateCondition(
  condition: AutomationCondition,
  context: AutomationEventContext,
): boolean {
  switch (condition.field) {
    case "invoice.currency":
      return (
        context.invoice?.currency.toUpperCase() === condition.value.toUpperCase()
      );
    case "invoice.total": {
      if (!context.invoice) {
        return false;
      }
      const left = moneyToCents(context.invoice.total);
      const right = moneyToCents(condition.value);
      return condition.operator === "greater_than"
        ? left > right
        : left < right;
    }
    case "payment.currency":
      return (
        context.payment?.currency.toUpperCase() ===
        condition.value.toUpperCase()
      );
    case "payment.amount": {
      if (!context.payment) {
        return false;
      }
      return (
        moneyToCents(context.payment.amount) > moneyToCents(condition.value)
      );
    }
    case "customer.company":
      return Boolean(context.customer?.company?.trim());
    case "customer.email":
      return Boolean(context.customer?.email?.trim());
    case "project.status":
      return context.project?.status === condition.value;
    case "project.previous_status":
      return context.project?.previousStatus === condition.value;
    default:
      return false;
  }
}
