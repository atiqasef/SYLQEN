import Link from "next/link";

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

type IntegrationCardProps = {
  item: IntegrationCatalogItem;
};

export function IntegrationCard({ item }: IntegrationCardProps) {
  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="space-y-3 p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 space-y-1">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              {item.category}
            </p>
            <CardTitle className="text-lg">{item.name}</CardTitle>
          </div>
          <IntegrationStatusBadge
            availability={item.availability}
            label={item.statusLabel}
          />
        </div>
        <CardDescription className="text-sm leading-6">
          {item.shortDescription}
        </CardDescription>
      </CardHeader>
      <CardContent className="mt-auto flex flex-col gap-4 p-5 pt-0 sm:p-6 sm:pt-0">
        <ul className="space-y-1.5 text-sm text-muted-foreground">
          {item.capabilities.slice(0, 3).map((capability) => (
            <li key={capability} className="flex gap-2">
              <span aria-hidden className="text-border">
                ·
              </span>
              <span>{capability}</span>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`/integrations/${item.slug}`}>View details</Link>
          </Button>
          {item.planned ? (
            <span className="text-xs text-muted-foreground">
              Not available yet
            </span>
          ) : item.supportsWorkspaceConnection ? null : (
            <span className="text-xs text-muted-foreground">
              No workspace connect flow
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
