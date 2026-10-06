import Link from "next/link";

import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { PlusIcon } from "@/components/layout/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProjectsPagination } from "@/features/projects/projects-pagination";
import { ProjectsSearchForm } from "@/features/projects/projects-search-form";
import { ProjectsTable } from "@/features/projects/projects-table";
import { isAppError, toAppError } from "@/lib/errors/app-error";
import { requireVerifiedPageSession } from "@/server/auth/session";
import { listProjectsForSession } from "@/server/projects/service";

type ProjectsPageProps = {
  searchParams: Promise<{
    q?: string | string[];
    page?: string | string[];
    pageSize?: string | string[];
  }>;
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ProjectsPage({ searchParams }: ProjectsPageProps) {
  const session = await requireVerifiedPageSession();

  const params = await searchParams;
  const q = firstParam(params.q);
  const page = firstParam(params.page);
  const pageSize = firstParam(params.pageSize);

  const canCreate = session.membership.permissions.includes("projects.create");

  let list;
  try {
    list = await listProjectsForSession(session, { q, page, pageSize });
  } catch (error) {
    const appError = toAppError(error);
    return (
      <div className="space-y-6 sm:space-y-8">
        <ProjectsPageHeader canCreate={canCreate} isDemo={session.user.isDemo} />
        <ErrorState
          title="Unable to load projects"
          description={
            isAppError(error)
              ? appError.userMessage
              : "Something went wrong while loading projects. Please try again."
          }
        />
      </div>
    );
  }

  const hasQuery = Boolean(list && q);
  const isEmpty = list.total === 0 && !hasQuery;
  const noResults = list.total === 0 && hasQuery;

  return (
    <div className="space-y-6 sm:space-y-8">
      <ProjectsPageHeader canCreate={canCreate} isDemo={session.user.isDemo} />

      {!isEmpty || hasQuery ? (
        <ProjectsSearchForm q={q} pageSize={list.pageSize} />
      ) : null}

      {isEmpty ? (
        <EmptyState
          title="No projects yet"
          description="Add your first project to start tracking work in this workspace."
          action={
            canCreate ? (
              <Button asChild>
                <Link href="/projects/new">
                  <PlusIcon aria-hidden="true" />
                  Add project
                </Link>
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">
                Demo accounts are read-only and cannot create projects.
              </p>
            )
          }
        />
      ) : null}

      {noResults ? (
        <EmptyState
          title="No matching projects"
          description={`No projects matched “${q}”. Try a different name, client, or description.`}
          action={
            <Button asChild variant="outline">
              <Link href="/projects">Clear search</Link>
            </Button>
          }
        />
      ) : null}

      {list.total > 0 ? (
        <section className="space-y-4" aria-labelledby="projects-results-heading">
          <div className="overflow-hidden rounded-[var(--radius-lg)] border border-border bg-card shadow-panel">
            <div className="border-b border-border px-4 py-3 sm:px-5">
              <h3
                id="projects-results-heading"
                className="text-sm font-semibold tracking-tight text-foreground"
              >
                Workspace projects
              </h3>
              <p className="mt-0.5 text-sm text-muted-foreground">
                <span className="font-medium tabular-nums text-foreground">
                  {list.total}
                </span>{" "}
                {list.total === 1 ? "project" : "projects"}
                {hasQuery ? (
                  <>
                    {" "}
                    matching{" "}
                    <span className="font-medium text-foreground">“{q}”</span>
                  </>
                ) : null}
              </p>
            </div>
            <div className="sm:px-1">
              <ProjectsTable projects={list.items} />
            </div>
            <div className="px-4 pb-4 sm:px-5">
              <ProjectsPagination result={list} q={q} />
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function ProjectsPageHeader({
  canCreate,
  isDemo,
}: {
  canCreate: boolean;
  isDemo: boolean;
}) {
  return (
    <section className="space-y-3" aria-labelledby="projects-heading">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 max-w-2xl space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h2
              id="projects-heading"
              className="text-2xl font-semibold tracking-tight text-foreground sm:text-[1.75rem] sm:leading-tight"
            >
              Projects
            </h2>
            {isDemo ? <Badge variant="warning">Demo read-only</Badge> : null}
          </div>
          <p className="text-sm leading-6 text-muted-foreground sm:text-[0.9375rem] sm:leading-7">
            Manage project records for your workspace. Search stays server-side
            and scoped to your membership.
          </p>
        </div>
        {canCreate ? (
          <Button asChild className="shrink-0">
            <Link href="/projects/new">
              <PlusIcon aria-hidden="true" />
              Add project
            </Link>
          </Button>
        ) : null}
      </div>
      {isDemo && !canCreate ? (
        <p
          role="status"
          className="rounded-[var(--radius-md)] border border-border bg-muted/60 px-3 py-2 text-sm leading-6 text-muted-foreground"
        >
          Demo accounts can view, search, and open projects, but cannot create or
          edit them.
        </p>
      ) : null}
    </section>
  );
}
