import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PROJECT_STATUS_LABELS } from "@/features/projects/schemas";
import type {
  AnalyticsProjectDueItem,
  AnalyticsProjectStatusCount,
} from "@/server/analytics/types";

type ProjectInsightsProps = {
  statusCounts: AnalyticsProjectStatusCount[];
  dueAttention: AnalyticsProjectDueItem[];
};

export function AnalyticsProjectInsights({
  statusCounts,
  dueAttention,
}: ProjectInsightsProps) {
  const total = statusCounts.reduce((sum, row) => sum + row.count, 0);

  return (
    <Card>
      <CardHeader className="p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle id="analytics-projects-heading">
              Project insights
            </CardTitle>
            <CardDescription>
              Status mix across the workspace. Due items show open projects with
              a due date in the next 14 days or already past due.
            </CardDescription>
          </div>
          <Link
            href="/projects"
            className="text-sm font-medium text-foreground underline-offset-4 hover:underline"
          >
            All projects
          </Link>
        </div>
      </CardHeader>
      <CardContent className="grid gap-6 p-5 pt-0 sm:p-6 sm:pt-0 lg:grid-cols-2">
        <section aria-labelledby="analytics-project-status">
          <h3
            id="analytics-project-status"
            className="text-sm font-semibold text-foreground"
          >
            By status
          </h3>
          {total === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              No projects yet. Create a project to track workload.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {statusCounts.map((row) => (
                <li
                  key={row.status}
                  className="flex items-center justify-between gap-3 rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm"
                >
                  <span className="text-foreground">
                    {PROJECT_STATUS_LABELS[row.status]}
                  </span>
                  <span className="font-mono tabular-nums text-muted-foreground">
                    {row.count}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="analytics-project-due">
          <h3
            id="analytics-project-due"
            className="text-sm font-semibold text-foreground"
          >
            Due soon / overdue
          </h3>
          {dueAttention.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              No open projects with upcoming or overdue due dates.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-border rounded-[var(--radius-md)] border border-border">
              {dueAttention.map((project) => (
                <li
                  key={project.id}
                  className="flex flex-col gap-1 px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <Link
                      href={`/projects/${project.id}`}
                      className="truncate text-sm font-medium text-foreground underline-offset-4 hover:underline"
                    >
                      {project.name}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {PROJECT_STATUS_LABELS[project.status]} · due{" "}
                      <span className="tabular-nums">{project.dueDate}</span>
                    </p>
                  </div>
                  {project.isOverdue ? (
                    <Badge variant="warning">Overdue</Badge>
                  ) : (
                    <Badge variant="secondary">Due soon</Badge>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </CardContent>
    </Card>
  );
}
