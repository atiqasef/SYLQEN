import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProjectForm } from "@/features/projects/project-form";
import { requireVerifiedPageSession } from "@/server/auth/session";

export default async function NewProjectPage() {
  const session = await requireVerifiedPageSession();
  const canCreate = session.membership.permissions.includes("projects.create");

  return (
    <div className="space-y-6 sm:space-y-8">
      <section className="space-y-3" aria-labelledby="new-project-heading">
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
            <li className="font-medium text-foreground">Add</li>
          </ol>
        </nav>
        <div className="flex flex-wrap items-center gap-2">
          <h2
            id="new-project-heading"
            className="text-2xl font-semibold tracking-tight text-foreground sm:text-[1.75rem] sm:leading-tight"
          >
            Add project
          </h2>
          {session.user.isDemo ? (
            <Badge variant="warning">Demo read-only</Badge>
          ) : null}
        </div>
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-[0.9375rem] sm:leading-7">
          Create a project record in{" "}
          <span className="font-medium text-foreground">
            {session.workspace.name}
          </span>
          . Required fields are validated on the server before saving.
        </p>
      </section>

      {!canCreate ? (
        <div className="space-y-4 rounded-[var(--radius-lg)] border border-border bg-card p-5 shadow-panel">
          <p role="status" className="text-sm leading-6 text-muted-foreground">
            You do not have permission to create projects
            {session.user.isDemo ? ". Demo accounts are read-only." : "."}
          </p>
          <Button asChild variant="outline">
            <Link href="/projects">Back to projects</Link>
          </Button>
        </div>
      ) : (
        <ProjectForm mode="create" cancelHref="/projects" />
      )}
    </div>
  );
}
