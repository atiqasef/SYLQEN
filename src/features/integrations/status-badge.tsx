import { Badge } from "@/components/ui/badge";
import type { IntegrationAvailability } from "@/server/integrations/types";

export function integrationAvailabilityBadgeVariant(
  availability: IntegrationAvailability,
): "success" | "warning" | "muted" | "outline" {
  switch (availability) {
    case "active":
      return "success";
    case "not_configured":
      return "warning";
    case "reserved":
      return "outline";
    case "planned":
      return "muted";
    default:
      return "muted";
  }
}

export function IntegrationStatusBadge({
  availability,
  label,
}: {
  availability: IntegrationAvailability;
  label: string;
}) {
  return (
    <Badge variant={integrationAvailabilityBadgeVariant(availability)}>
      {label}
    </Badge>
  );
}
