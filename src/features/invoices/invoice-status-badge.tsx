import { Badge } from "@/components/ui/badge";
import {
  INVOICE_STATUS_LABELS,
  type InvoiceStatus,
} from "@/features/invoices/schemas";
import { cn } from "@/lib/utils/cn";

const STATUS_VARIANT: Record<
  InvoiceStatus,
  "muted" | "secondary" | "success" | "warning"
> = {
  draft: "muted",
  sent: "secondary",
  paid: "success",
  overdue: "warning",
};

type InvoiceStatusBadgeProps = {
  status: InvoiceStatus;
  className?: string;
};

export function InvoiceStatusBadge({
  status,
  className,
}: InvoiceStatusBadgeProps) {
  return (
    <Badge
      variant={STATUS_VARIANT[status]}
      className={cn("rounded-[var(--radius-sm)] px-2 py-0.5 font-medium", className)}
    >
      {INVOICE_STATUS_LABELS[status]}
    </Badge>
  );
}
