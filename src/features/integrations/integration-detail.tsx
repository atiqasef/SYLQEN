import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { IntegrationStatusBadge } from "@/features/integrations/status-badge";
import type { IntegrationCatalogItem } from "@/server/integrations/types";

type IntegrationDetailProps = {
  item: IntegrationCatalogItem;
};

export function IntegrationDetailView({ item }: IntegrationDetailProps) {
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Card>
        <CardHeader className="space-y-3 p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{item.category}</Badge>
            <IntegrationStatusBadge
              availability={item.availability}
              label={item.statusLabel}
            />
          </div>
          <CardTitle className="text-xl sm:text-2xl">{item.name}</CardTitle>
          <CardDescription className="text-sm leading-6 sm:text-[0.9375rem] sm:leading-7">
            {item.description}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 p-5 pt-0 sm:p-6 sm:pt-0">
          <section aria-labelledby="integration-capabilities-heading">
            <h3
              id="integration-capabilities-heading"
              className="text-sm font-semibold text-foreground"
            >
              Capabilities
            </h3>
            <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
              {item.capabilities.map((capability) => (
                <li key={capability} className="flex gap-2">
                  <span aria-hidden>·</span>
                  <span>{capability}</span>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="integration-config-heading">
            <h3
              id="integration-config-heading"
              className="text-sm font-semibold text-foreground"
            >
              Configuration
            </h3>
            <dl className="mt-2 space-y-2 text-sm">
              <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
                <dt className="shrink-0 text-muted-foreground">Source</dt>
                <dd className="text-foreground">
                  {item.configurationSource === "environment"
                    ? "Deployment environment (server-only)"
                    : item.configurationSource === "provider_abstraction"
                      ? "Server provider abstraction"
                      : "Not configurable"}
                </dd>
              </div>
              <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
                <dt className="shrink-0 text-muted-foreground">Summary</dt>
                <dd className="text-foreground">{item.configurationSummary}</dd>
              </div>
              <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
                <dt className="shrink-0 text-muted-foreground">
                  Workspace connect
                </dt>
                <dd className="text-foreground">
                  {item.supportsWorkspaceConnection
                    ? "Supported"
                    : "Not available in this phase"}
                </dd>
              </div>
            </dl>
          </section>

          <section
            aria-labelledby="integration-security-heading"
            className="rounded-[var(--radius-md)] border border-border bg-muted/40 px-3 py-3 sm:px-4"
          >
            <h3
              id="integration-security-heading"
              className="text-sm font-semibold text-foreground"
            >
              Security
            </h3>
            <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
              {item.securityNote}
            </p>
          </section>

          {item.planned ? (
            <p
              role="status"
              className="rounded-[var(--radius-md)] border border-dashed border-border px-3 py-3 text-sm text-muted-foreground"
            >
              This integration is planned. There is no connect button and no
              backend implementation yet.
            </p>
          ) : null}

          <Button asChild variant="outline">
            <Link href="/integrations">Back to integrations</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
