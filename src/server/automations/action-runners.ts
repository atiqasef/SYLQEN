import "server-only";

import type { AutomationAction } from "@/features/automations/schemas";
import { AppError } from "@/lib/errors/app-error";
import { insertAutomationNotification } from "@/server/automations/repository";
import type {
  AutomationDocument,
  AutomationEventContext,
} from "@/server/automations/types";

export type ActionRunResult = {
  summary: string;
};

/**
 * Execute a declarative action. Only notification.create is shipped in Phase 17.
 * Task actions and external integrations are deferred.
 */
export async function runAutomationAction(options: {
  action: AutomationAction;
  automation: AutomationDocument;
  context: AutomationEventContext;
}): Promise<ActionRunResult> {
  switch (options.action.type) {
    case "notification.create": {
      await insertAutomationNotification({
        workspaceId: options.context.workspaceId,
        automationId: options.automation._id.toHexString(),
        automationNameSnapshot: options.automation.name,
        title: options.action.title,
        message: options.action.message,
        triggerType: options.context.type,
        eventKey: options.context.eventKey,
        createdAt: new Date(),
      });
      return {
        summary: `Notification created: ${options.action.title}`,
      };
    }
    default: {
      throw new AppError({
        code: "INTERNAL_ERROR",
        message: `Unsupported automation action: ${(options.action as { type: string }).type}`,
        userMessage:
          "This automation action is not supported. Update the automation and try again.",
      });
    }
  }
}
