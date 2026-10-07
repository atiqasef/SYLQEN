import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { AUTOMATION_TRIGGER_LABELS } from "@/features/automations/schemas";
import type { AutomationDTO } from "@/server/automations/types";

type AutomationsTableProps = {
  items: AutomationDTO[];
};

function formatDate(value?: string) {
  if (!value) {
    return "—";
  }
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export function AutomationsTable({ items }: AutomationsTableProps) {
  return (
    <>
      <div className="hidden overflow-x-auto rounded-[var(--radius-lg)] border border-border md:block">
        <table className="w-full min-w-[40rem] text-left text-sm">
          <thead className="border-b border-border bg-muted/40 text-xs tracking-wide text-muted-foreground uppercase">
            <tr>
              <th className="px-3 py-2.5 font-medium">Name</th>
              <th className="px-3 py-2.5 font-medium">Trigger</th>
              <th className="px-3 py-2.5 font-medium">Status</th>
              <th className="px-3 py-2.5 font-medium">Last run</th>
              <th className="px-3 py-2.5 font-medium">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {items.map((item) => (
              <tr key={item.id}>
                <td className="px-3 py-3">
                  <Link
                    href={`/automations/${item.id}`}
                    className="font-medium text-foreground underline-offset-4 hover:underline"
                  >
                    {item.name}
                  </Link>
                </td>
                <td className="px-3 py-3 text-muted-foreground">
                  {AUTOMATION_TRIGGER_LABELS[item.trigger.type]}
                </td>
                <td className="px-3 py-3">
                  <Badge variant={item.enabled ? "success" : "muted"}>
                    {item.enabled ? "Enabled" : "Disabled"}
                  </Badge>
                </td>
                <td className="px-3 py-3 tabular-nums text-muted-foreground">
                  {item.lastRunAt
                    ? `${formatDate(item.lastRunAt)}${
                        item.lastRunStatus ? ` · ${item.lastRunStatus}` : ""
                      }`
                    : "Never"}
                </td>
                <td className="px-3 py-3 tabular-nums text-muted-foreground">
                  {formatDate(item.createdAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="divide-y divide-border rounded-[var(--radius-lg)] border border-border md:hidden">
        {items.map((item) => (
          <li key={item.id} className="space-y-2 px-3 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Link
                href={`/automations/${item.id}`}
                className="font-medium text-foreground underline-offset-4 hover:underline"
              >
                {item.name}
              </Link>
              <Badge variant={item.enabled ? "success" : "muted"}>
                {item.enabled ? "Enabled" : "Disabled"}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {AUTOMATION_TRIGGER_LABELS[item.trigger.type]}
            </p>
            <p className="text-xs text-muted-foreground">
              Last run{" "}
              {item.lastRunAt ? formatDate(item.lastRunAt) : "never"} · Created{" "}
              {formatDate(item.createdAt)}
            </p>
          </li>
        ))}
      </ul>
    </>
  );
}
