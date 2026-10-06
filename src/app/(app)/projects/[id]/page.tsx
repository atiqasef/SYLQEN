import Link from "next/link";
import { notFound } from "next/navigation";

import { ErrorState } from "@/components/feedback/error-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PROJECT_STATUS_LABELS } from "@/features/projects/schemas";
import { isAppError, toAppError } from "@/lib/errors/app-error";
import { requireVerifiedPageSession } from "@/server/auth/session";
import { getProjectForSession } from "@/server/projects/service";
import { cn } from "@/lib/utils/cn";

type ProjectDetailPageProps = {
  params: Promise<{ id: string }>;
};

function formatDateTime(iso: string) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function formatDateOnly(value?: string) {
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

function DetailValue({
  value,
  empty = "Not provided",
  multiline = false,
}: {
  value?: string | null;
  empty?: string;
  multiline?: boolean;
}) {
  if (!value) {
    return <span className="font-normal text-muted-foreground/80">{empty}</span>;
  }

  return (
    <span
      className={cn(
        "font-medium text-foreground",
        multiline && "whitespace-pre-wrap break-words",
      )}
    >
      {value}
    </span>
  );
}

export default async function ProjectDetailPage({
  params,
}: ProjectDetailPageProps) {
  const session = await requireVerifiedPageSession();
  const { id } = await params;
  const canUpdate = session.membership.permissions.includes("projects.update");

  let project;
  try {
    project = await getProjectForSession(session, id);
  } catch (error) {
    if (isAppError(error) && error.code === "NOT_FOUND") {
      notFound();
    }
    const appError = toAppError(error);
    return (
      <ErrorState
        title="Unable to load project"
        description={appError.userMessage}
      />
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <section className="space-y-4" aria-labelledby="project-detail-heading">
        <nav aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
            <li>
              <Link
                href="/projects"
                className="transition-ui hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Projects
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li className="truncate font-medium text-foreground">{project.name}</li>
          </ol>
        </nav>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h2
                id="project-detail-heading"
                className="truncate text-2xl font-semibold tracking-tight text-foreground sm:text-[1.75rem] sm:leading-tight"
              >
                {project.name}
              </h2>
              {session.user.isDemo ? (
                <Badge variant="warning">Demo read-only</Badge>
              ) : null}
            </div>
            <p className="text-sm text-muted-foreground">
              {PROJECT_STATUS_LABELS[project.status]}
              {project.clientName ? ` · ${project.clientName}` : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 sm:shrink-0">
            <Button asChild variant="outline">
              <Link href="/projects">Back to list</Link>
            </Button>
            {canUpdate ? (
              <Button asChild>
                <Link href={`/projects/${project.id}/edit`}>Edit</Link>
              </Button>
            ) : null}
          </div>
        </div>

        {session.user.isDemo && !canUpdate ? (
          <p
            role="status"
            className="rounded-[var(--radius-md)] border border-border bg-muted/60 px-3 py-2 text-sm leading-6 text-muted-foreground"
          >
            Demo accounts can view project details, but cannot edit them.
          </p>
        ) : null}
      </section>

      <div className="mx-auto grid max-w-3xl gap-4">
        <section
          className="overflow-hidden rounded-[var(--radius-lg)] border border-border bg-card shadow-panel"
          aria-labelledby="project-info-heading"
        >
          <div className="border-b border-border px-4 py-3.5 sm:px-5">
            <h3
              id="project-info-heading"
              className="text-sm font-semibold tracking-tight text-foreground"
            >
              Details
            </h3>
          </div>
          <dl className="divide-y divide-border">
            {[
              {
                label: "Status",
                value: PROJECT_STATUS_LABELS[project.status],
              },
              { label: "Client", value: project.clientName },
              {
                label: "Start date",
                value: formatDateOnly(project.startDate),
              },
              {
                label: "Due date",
                value: formatDateOnly(project.dueDate),
              },
              {
                label: "Description",
                value: project.description,
                multiline: true,
              },
            ].map((field) => (
              <div
                key={field.label}
                className="grid gap-1 px-4 py-3.5 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-4 sm:px-5"
              >
                <dt className="text-sm text-muted-foreground">{field.label}</dt>
                <dd className="min-w-0 text-sm">
                  <DetailValue
                    value={field.value}
                    multiline={"multiline" in field && field.multiline}
                  />
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <section
          className="overflow-hidden rounded-[var(--radius-lg)] border border-border bg-card shadow-panel"
          aria-labelledby="project-record-heading"
        >
          <div className="border-b border-border px-4 py-3.5 sm:px-5">
            <h3
              id="project-record-heading"
              className="text-sm font-semibold tracking-tight text-foreground"
            >
              Record
            </h3>
          </div>
          <dl className="divide-y divide-border">
            <div className="grid gap-1 px-4 py-3.5 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-4 sm:px-5">
              <dt className="text-sm text-muted-foreground">Created</dt>
              <dd className="text-sm font-medium tabular-nums text-foreground">
                {formatDateTime(project.createdAt)}
              </dd>
            </div>
            <div className="grid gap-1 px-4 py-3.5 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-4 sm:px-5">
              <dt className="text-sm text-muted-foreground">Updated</dt>
              <dd className="text-sm font-medium tabular-nums text-foreground">
                {formatDateTime(project.updatedAt)}
              </dd>
            </div>
          </dl>
        </section>
      </div>
    </div>
  );
}
