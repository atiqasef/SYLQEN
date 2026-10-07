import "server-only";

import { AppError } from "@/lib/errors/app-error";
import type { SessionContext } from "@/server/auth/types";
import {
  getIntegrationDefinitionBySlug,
  listIntegrationDefinitions,
} from "@/server/integrations/catalog";
import {
  assertSafeIntegrationDto,
  readIntegrationRuntimeFlags,
  resolveIntegrationCatalogItem,
} from "@/server/integrations/status";
import type {
  IntegrationCatalogItem,
  IntegrationsSnapshot,
} from "@/server/integrations/types";

function assertIntegrationsRead(session: SessionContext) {
  if (!session.membership.permissions.includes("workspace.read")) {
    throw new AppError({
      code: "FORBIDDEN",
      message: "Missing integrations read permission",
      userMessage: "You do not have permission to view integrations.",
    });
  }
}

/**
 * Read-only integrations hub. No Mongo collection — static catalog +
 * deployment-derived status flags (never secrets).
 */
export function getIntegrationsSnapshotForSession(
  session: SessionContext,
): IntegrationsSnapshot {
  assertIntegrationsRead(session);
  const flags = readIntegrationRuntimeFlags();
  const items = listIntegrationDefinitions().map((definition) => {
    const item = resolveIntegrationCatalogItem(definition, flags);
    assertSafeIntegrationDto(item);
    return item;
  });
  return { items };
}

export function getIntegrationBySlugForSession(
  session: SessionContext,
  slug: string,
): IntegrationCatalogItem {
  assertIntegrationsRead(session);
  const definition = getIntegrationDefinitionBySlug(slug);
  if (!definition) {
    throw new AppError({
      code: "NOT_FOUND",
      message: `Unknown integration: ${slug}`,
      userMessage: "That integration was not found.",
    });
  }
  const item = resolveIntegrationCatalogItem(
    definition,
    readIntegrationRuntimeFlags(),
  );
  assertSafeIntegrationDto(item);
  return item;
}
