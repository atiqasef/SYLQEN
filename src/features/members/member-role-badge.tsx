import { Badge } from "@/components/ui/badge";
import {
  MEMBER_ROLE_LABELS,
  type ManageableMemberRole,
} from "@/features/members/schemas";
import { cn } from "@/lib/utils/cn";

type MemberRoleBadgeProps = {
  role: ManageableMemberRole | "admin";
  className?: string;
};

const ROLE_VARIANT: Record<
  ManageableMemberRole | "admin",
  "default" | "secondary" | "outline" | "muted"
> = {
  owner: "default",
  admin: "secondary",
  member: "secondary",
  viewer: "muted",
};

/** Role chip with readable text label (not color-only). */
export function MemberRoleBadge({ role, className }: MemberRoleBadgeProps) {
  return (
    <Badge
      variant={ROLE_VARIANT[role]}
      className={cn(
        "rounded-[var(--radius-sm)] px-2 py-0.5 font-medium tracking-wide",
        className,
      )}
    >
      {MEMBER_ROLE_LABELS[role]}
    </Badge>
  );
}
