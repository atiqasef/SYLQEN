import Link from "next/link";
import { notFound } from "next/navigation";

import { ErrorState } from "@/components/feedback/error-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProjectForm } from "@/features/projects/project-form";
import { ProjectStatusBadge } from "@/features/projects/project-status-badge";
import { isAppError, toAppError } from "@/lib/errors/app-error";
import { requireVerifiedPageSession } from "@/server/auth/session";
import { getProjectForSession } from "@/server/projects/service";

type EditProjectPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditProjectPage({
  params,
}: EditProjectPageProps) {
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
      <section className="space-y-3" aria-labelledby="edit-project-heading">
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
            <li className="min-w-0">
              <Link
                href={`/projects/${project.id}`}
                className="truncate transition-ui hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {project.name}
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li className="font-medium text-foreground">Edit</li>
          </ol>
        </nav>
        <div className="flex flex-wrap items-center gap-2">
          <h2
            id="edit-project-heading"
            className="text-2xl font-semibold tracking-tight text-foreground sm:text-[1.75rem] sm:leading-tight"
          >
            Edit project
          </h2>
          <ProjectStatusBadge status={project.status} />
          {session.user.isDemo ? (
            <Badge variant="warning">Demo read-only</Badge>
          ) : null}
        </div>
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-[0.9375rem] sm:leading-7">
          Updating{" "}
          <span className="font-medium text-foreground">{project.name}</span>
          {project.clientName ? (
            <>
              {" "}
              for{" "}
              <span className="font-medium text-foreground">
                {project.clientName}
              </span>
            </>
          ) : null}
          . Changes replace the saved record after server validation.
        </p>
      </section>

      {!canUpdate ? (
        <div className="space-y-4 rounded-[var(--radius-lg)] border border-border bg-card p-5 shadow-panel">
          <p role="status" className="text-sm leading-6 text-muted-foreground">
            You do not have permission to edit projects
            {session.user.isDemo ? ". Demo accounts are read-only." : "."}
          </p>
          <Button asChild variant="outline">
            <Link href={`/projects/${project.id}`}>Back to project</Link>
          </Button>
        </div>
      ) : (
        <ProjectForm
          mode="edit"
          projectId={project.id}
          cancelHref={`/projects/${project.id}`}
          initialValues={{
            name: project.name,
            description: project.description,
            status: project.status,
            clientName: project.clientName,
            startDate: project.startDate,
            dueDate: project.dueDate,
          }}
        />
      )}
    </div>
  );
}
