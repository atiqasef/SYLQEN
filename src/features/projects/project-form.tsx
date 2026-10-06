"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";

import { AuthAlert } from "@/components/auth/auth-form-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  PROJECT_STATUSES,
  PROJECT_STATUS_LABELS,
  type ProjectInput,
} from "@/features/projects/schemas";
import {
  createProjectAction,
  updateProjectAction,
} from "@/server/projects/actions";
import { cn } from "@/lib/utils/cn";

type ProjectFormProps = {
  mode: "create" | "edit";
  projectId?: string;
  initialValues?: Partial<ProjectInput>;
  cancelHref: string;
};

type FieldErrors = Record<string, string[] | undefined>;

function fieldError(fieldErrors: FieldErrors | undefined, key: string) {
  return fieldErrors?.[key]?.[0];
}

function FieldHint({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <p id={id} className="text-xs leading-5 text-muted-foreground">
      {children}
    </p>
  );
}

const selectClassName = cn(
  "flex h-10 w-full rounded-[var(--radius-md)] border border-input bg-card px-3 py-2 text-sm text-foreground shadow-panel transition-ui",
  "focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
  "disabled:cursor-not-allowed disabled:opacity-50",
  "aria-[invalid=true]:border-destructive/60",
);

export function ProjectForm({
  mode,
  projectId,
  initialValues,
  cancelHref,
}: ProjectFormProps) {
  const router = useRouter();
  const [name, setName] = React.useState(initialValues?.name ?? "");
  const [description, setDescription] = React.useState(
    initialValues?.description ?? "",
  );
  const [status, setStatus] = React.useState<ProjectInput["status"]>(
    initialValues?.status ?? "planning",
  );
  const [clientName, setClientName] = React.useState(
    initialValues?.clientName ?? "",
  );
  const [startDate, setStartDate] = React.useState(
    initialValues?.startDate ?? "",
  );
  const [dueDate, setDueDate] = React.useState(initialValues?.dueDate ?? "");
  const [error, setError] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<FieldErrors>();
  const [pending, setPending] = React.useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setFieldErrors(undefined);

    const payload = {
      name,
      description,
      status,
      clientName,
      startDate,
      dueDate,
    };

    const result =
      mode === "create"
        ? await createProjectAction(payload)
        : await updateProjectAction(projectId!, payload);

    setPending(false);

    if (!result.ok) {
      setError(result.error);
      setFieldErrors(result.fieldErrors);
      return;
    }

    router.push(`/projects/${result.id}`);
    router.refresh();
  }

  return (
    <form
      className="mx-auto max-w-2xl space-y-5"
      onSubmit={onSubmit}
      noValidate
      aria-busy={pending}
    >
      {error ? <AuthAlert>{error}</AuthAlert> : null}

      <div className="overflow-hidden rounded-[var(--radius-lg)] border border-border bg-card shadow-panel">
        <div className="border-b border-border px-4 py-3.5 sm:px-5">
          <h3 className="text-sm font-semibold tracking-tight text-foreground">
            Project details
          </h3>
          <p className="mt-1 text-xs leading-5 text-muted-foreground sm:text-sm">
            Name and status identify this project in your workspace.
          </p>
        </div>

        <fieldset disabled={pending} className="space-y-5 px-4 py-5 sm:px-5">
          <legend className="sr-only">
            {mode === "create" ? "Create project" : "Edit project"}
          </legend>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <div className="flex items-baseline justify-between gap-3">
                <Label htmlFor="project-name">Name</Label>
                <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                  Required
                </span>
              </div>
              <Input
                id="project-name"
                name="name"
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Website redesign"
                aria-invalid={Boolean(fieldError(fieldErrors, "name"))}
                aria-describedby={
                  fieldError(fieldErrors, "name")
                    ? "project-name-error"
                    : undefined
                }
              />
              {fieldError(fieldErrors, "name") ? (
                <p
                  id="project-name-error"
                  className="text-xs text-destructive"
                  role="alert"
                >
                  {fieldError(fieldErrors, "name")}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <div className="flex items-baseline justify-between gap-3">
                <Label htmlFor="project-status">Status</Label>
                <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                  Required
                </span>
              </div>
              <select
                id="project-status"
                name="status"
                required
                value={status}
                onChange={(event) =>
                  setStatus(event.target.value as ProjectInput["status"])
                }
                className={selectClassName}
                aria-invalid={Boolean(fieldError(fieldErrors, "status"))}
                aria-describedby={
                  fieldError(fieldErrors, "status")
                    ? "project-status-error"
                    : undefined
                }
              >
                {PROJECT_STATUSES.map((value) => (
                  <option key={value} value={value}>
                    {PROJECT_STATUS_LABELS[value]}
                  </option>
                ))}
              </select>
              {fieldError(fieldErrors, "status") ? (
                <p
                  id="project-status-error"
                  className="text-xs text-destructive"
                  role="alert"
                >
                  {fieldError(fieldErrors, "status")}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <div className="flex items-baseline justify-between gap-3">
                <Label htmlFor="project-client">Client</Label>
                <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                  Optional
                </span>
              </div>
              <Input
                id="project-client"
                name="clientName"
                value={clientName}
                onChange={(event) => setClientName(event.target.value)}
                placeholder="Acme Operations"
                aria-invalid={Boolean(fieldError(fieldErrors, "clientName"))}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-baseline justify-between gap-3">
                <Label htmlFor="project-start-date">Start date</Label>
                <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                  Optional
                </span>
              </div>
              <Input
                id="project-start-date"
                name="startDate"
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                aria-invalid={Boolean(fieldError(fieldErrors, "startDate"))}
                aria-describedby={
                  fieldError(fieldErrors, "startDate")
                    ? "project-start-date-error"
                    : undefined
                }
              />
              {fieldError(fieldErrors, "startDate") ? (
                <p
                  id="project-start-date-error"
                  className="text-xs text-destructive"
                  role="alert"
                >
                  {fieldError(fieldErrors, "startDate")}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <div className="flex items-baseline justify-between gap-3">
                <Label htmlFor="project-due-date">Due date</Label>
                <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                  Optional
                </span>
              </div>
              <Input
                id="project-due-date"
                name="dueDate"
                type="date"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
                aria-invalid={Boolean(fieldError(fieldErrors, "dueDate"))}
                aria-describedby={
                  fieldError(fieldErrors, "dueDate")
                    ? "project-due-date-error"
                    : "project-due-date-hint"
                }
              />
              {fieldError(fieldErrors, "dueDate") ? (
                <p
                  id="project-due-date-error"
                  className="text-xs text-destructive"
                  role="alert"
                >
                  {fieldError(fieldErrors, "dueDate")}
                </p>
              ) : (
                <FieldHint id="project-due-date-hint">
                  Must be on or after the start date when both are set.
                </FieldHint>
              )}
            </div>

            <div className="space-y-2 sm:col-span-2">
              <div className="flex items-baseline justify-between gap-3">
                <Label htmlFor="project-description">Description</Label>
                <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                  Optional
                </span>
              </div>
              <Textarea
                id="project-description"
                name="description"
                rows={4}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Short summary for your team"
                aria-invalid={Boolean(fieldError(fieldErrors, "description"))}
              />
            </div>
          </div>
        </fieldset>
      </div>

      <div
        className={cn(
          "flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between",
          "rounded-[var(--radius-lg)] border border-border bg-muted/40 px-4 py-3.5 sm:px-5",
        )}
      >
        <Button type="button" variant="ghost" asChild>
          <Link href={cancelHref}>Cancel</Link>
        </Button>
        <Button type="submit" disabled={pending} className="sm:min-w-[9.5rem]">
          {pending
            ? mode === "create"
              ? "Creating…"
              : "Saving…"
            : mode === "create"
              ? "Create project"
              : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
