import { Badge } from "@/components/ui/badge";
import {
  PAYMENT_METHOD_LABELS,
  type PaymentMethod,
} from "@/features/payments/schemas";
import { cn } from "@/lib/utils/cn";

type PaymentMethodBadgeProps = {
  method: PaymentMethod;
  className?: string;
};

/** Compact method chip with readable text label (not color-only). */
export function PaymentMethodBadge({
  method,
  className,
}: PaymentMethodBadgeProps) {
  return (
    <Badge
      variant="muted"
      className={cn("rounded-[var(--radius-sm)] px-2 py-0.5 font-medium", className)}
    >
      {PAYMENT_METHOD_LABELS[method]}
    </Badge>
  );
}
