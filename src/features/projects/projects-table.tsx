import Link from "next/link";

import { ChevronRightIcon } from "@/components/layout/icons";
import { PROJECT_STATUS_LABELS } from "@/features/projects/schemas";
import type { ProjectDTO } from "@/server/projects/types";
import { cn } from "@/lib/utils/cn";

type ProjectsTableProps = {
  projects: ProjectDTO[];
};

function formatDate(value?: string) {
  if (!value) {
    return null;
  }
  try {
    const [year, month, day] = value.split("-").map(Number);
    return new Intl.DateTimeFormat(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    }).format(new Date(Date.UTC(year!, month! - 1, day!)));
  } catch {
    return value;
  }
}

export function ProjectsTable({ projects }: ProjectsTableProps) {
  return (
    <>
      <div className="hidden md:block">
        <table className="w-full min-w-0 border-collapse text-left text-sm">
          <caption className="sr-only">Projects in your workspace</caption>
          <thead>
            <tr className="border-b border-border">
              <th
                scope="col"
                className="px-4 py-3 text-[11px] font-medium tracking-[0.08em] text-muted-foreground uppercase"
              >
                Project
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-[11px] font-medium tracking-[0.08em] text-muted-foreground uppercase"
              >
                Status
              </th>
              <th
                scope="col"
                className="hidden px-4 py-3 text-[11px] font-medium tracking-[0.08em] text-muted-foreground uppercase lg:table-cell"
              >
                Client
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-right text-[11px] font-medium tracking-[0.08em] text-muted-foreground uppercase"
              >
                Due
              </th>
              <th scope="col" className="w-10 px-2 py-3">
                <span className="sr-only">Open</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {projects.map((project) => (
              <tr
                key={project.id}
                className="group border-b border-border last:border-0 transition-ui hover:bg-muted/45"
              >
                <th scope="row" className="px-4 py-3.5 font-normal">
                  <Link
                    href={`/projects/${project.id}`}
                    className="block min-w-0 rounded-[var(--radius-sm)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span className="block truncate font-medium text-foreground group-hover:text-primary">
                      {project.name}
                    </span>
                    {project.startDate ? (
                      <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                        Starts {formatDate(project.startDate)}
                      </span>
                    ) : null}
                  </Link>
                </th>
                <td className="px-4 py-3.5 text-muted-foreground">
                  {PROJECT_STATUS_LABELS[project.status]}
                </td>
                <td className="hidden max-w-[12rem] truncate px-4 py-3.5 text-muted-foreground lg:table-cell">
                  {project.clientName ?? (
                    <span className="text-muted-foreground/70">—</span>
                  )}
                </td>
                <td className="px-4 py-3.5 text-right tabular-nums text-muted-foreground">
                  {formatDate(project.dueDate) ?? (
                    <span className="text-muted-foreground/70">—</span>
                  )}
                </td>
                <td className="px-2 py-3.5 text-muted-foreground" aria-hidden="true">
                  <span
                    className={cn(
                      "inline-flex size-8 items-center justify-center rounded-[var(--radius-sm)]",
                      "opacity-50 transition-ui group-hover:opacity-100 group-hover:text-primary",
                    )}
                  >
                    <ChevronRightIcon className="size-4" />
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="divide-y divide-border md:hidden" aria-label="Projects">
        {projects.map((project) => (
          <li key={project.id}>
            <Link
              href={`/projects/${project.id}`}
              className="flex items-start gap-3 px-3 py-3.5 transition-ui hover:bg-muted/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium text-foreground">
                  {project.name}
                </span>
                <span className="mt-0.5 block truncate text-sm text-muted-foreground">
                  {PROJECT_STATUS_LABELS[project.status]}
                  {project.clientName ? ` · ${project.clientName}` : ""}
                </span>
                {project.dueDate ? (
                  <span className="mt-1 block truncate text-xs text-muted-foreground">
                    Due {formatDate(project.dueDate)}
                  </span>
                ) : null}
              </span>
              <ChevronRightIcon
                className="mt-1 size-4 shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
