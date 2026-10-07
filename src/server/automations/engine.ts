import "server-only";

import { evaluateConditions } from "@/server/automations/conditions";
import { runAutomationAction } from "@/server/automations/action-runners";
import {
  ensureAutomationIndexes,
  listEnabledAutomationsForTrigger,
  markAutomationLastRun,
  tryInsertExecution,
  updateExecutionResult,
} from "@/server/automations/repository";
import type {
  AutomationDocument,
  AutomationEventContext,
} from "@/server/automations/types";
import { logger } from "@/server/logging/logger";

/**
 * Process a domain event for workspace automations.
 * Synchronous and bounded. Never throws to the calling domain operation —
 * failures are recorded on executions / logged.
 */
export async function processAutomationEvent(
  context: AutomationEventContext,
): Promise<void> {
  try {
    await ensureAutomationIndexes();
    const automations = await listEnabledAutomationsForTrigger({
      workspaceId: context.workspaceId,
      triggerType: context.type,
    });

    for (const automation of automations) {
      await runSingleAutomation({ automation, context });
    }
  } catch (error) {
    logger.error("Automation engine failed", {
      workspaceId: context.workspaceId,
      triggerType: context.type,
      eventKey: context.eventKey,
      error: error instanceof Error ? error.message : "unknown",
    });
  }
}

async function runSingleAutomation(options: {
  automation: AutomationDocument;
  context: AutomationEventContext;
}): Promise<void> {
  const { automation, context } = options;
  const startedAt = new Date();
  const automationId = automation._id.toHexString();

  if (!evaluateConditions(automation.conditions, context)) {
    const completedAt = new Date();
    const insert = await tryInsertExecution({
      workspaceId: context.workspaceId,
      automationId,
      automationNameSnapshot: automation.name,
      triggerType: context.type,
      eventKey: context.eventKey,
      status: "skipped",
      startedAt,
      completedAt,
      errorMessage: "Conditions not met",
      actionSummaries: [],
      createdAt: completedAt,
    });
    if (insert.inserted) {
      await markAutomationLastRun({
        workspaceId: context.workspaceId,
        automationId,
        status: "skipped",
        ranAt: completedAt,
      });
    }
    return;
  }

  // Claim the (workspace, automation, eventKey) slot for idempotency.
  const reservedAt = new Date();
  const reservation = await tryInsertExecution({
    workspaceId: context.workspaceId,
    automationId,
    automationNameSnapshot: automation.name,
    triggerType: context.type,
    eventKey: context.eventKey,
    status: "success",
    startedAt,
    completedAt: reservedAt,
    actionSummaries: [],
    createdAt: reservedAt,
  });

  if (!reservation.inserted || !reservation.doc) {
    return;
  }

  try {
    const summaries: string[] = [];
    for (const action of automation.actions) {
      const result = await runAutomationAction({
        action,
        automation,
        context,
      });
      summaries.push(result.summary);
    }

    const completedAt = new Date();
    await updateExecutionResult({
      workspaceId: context.workspaceId,
      executionId: reservation.doc._id,
      status: "success",
      completedAt,
      actionSummaries: summaries,
    });
    await markAutomationLastRun({
      workspaceId: context.workspaceId,
      automationId,
      status: "success",
      ranAt: completedAt,
    });
  } catch (error) {
    const completedAt = new Date();
    const message =
      error instanceof Error ? error.message : "Automation action failed";
    const safeMessage = message.slice(0, 240);
    await updateExecutionResult({
      workspaceId: context.workspaceId,
      executionId: reservation.doc._id,
      status: "failed",
      completedAt,
      actionSummaries: [],
      errorMessage: safeMessage,
    });
    await markAutomationLastRun({
      workspaceId: context.workspaceId,
      automationId,
      status: "failed",
      ranAt: completedAt,
    });
    logger.warn("Automation action failed", {
      workspaceId: context.workspaceId,
      automationId,
      eventKey: context.eventKey,
      error: safeMessage,
    });
  }
}
