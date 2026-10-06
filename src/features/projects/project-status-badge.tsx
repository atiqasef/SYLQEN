import { Badge } from "@/components/ui/badge";
import {
  PROJECT_STATUS_LABELS,
  type ProjectStatus,
} from "@/features/projects/schemas";
import { cn } from "@/lib/utils/cn";

const STATUS_VARIANT: Record<
  ProjectStatus,
  "muted" | "success" | "warning" | "secondary"
> = {
  planning: "muted",
  active: "success",
  on_hold: "warning",
  completed: "secondary",
};

type ProjectStatusBadgeProps = {
  status: ProjectStatus;
  className?: string;
};

/** Compact status chip with text label (not color-only). */
export function ProjectStatusBadge({
  status,
  className,
}: ProjectStatusBadgeProps) {
  return (
    <Badge
      variant={STATUS_VARIANT[status]}
      className={cn("rounded-[var(--radius-sm)] px-2 py-0.5 font-medium", className)}
    >
      {PROJECT_STATUS_LABELS[status]}
    </Badge>
  );
}
