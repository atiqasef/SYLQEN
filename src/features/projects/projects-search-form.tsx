"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";

import { SearchIcon } from "@/components/layout/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ProjectsSearchFormProps = {
  q?: string;
  pageSize: number;
};

export function ProjectsSearchForm({ q, pageSize }: ProjectsSearchFormProps) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const hasQuery = Boolean(q);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const nextQuery = String(formData.get("q") ?? "").trim();
    const params = new URLSearchParams();

    if (nextQuery) {
      params.set("q", nextQuery.slice(0, 100));
    }
    if (pageSize !== 20) {
      params.set("pageSize", String(pageSize));
    }

    const href = params.size > 0 ? `/projects?${params.toString()}` : "/projects";
    startTransition(() => {
      router.push(href);
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-[var(--radius-lg)] border border-border bg-card p-4 shadow-panel sm:p-5"
      role="search"
      aria-busy={pending}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1 space-y-2">
          <Label htmlFor="projects-search">Search projects</Label>
          <div className="relative">
            <SearchIcon
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              id="projects-search"
              name="q"
              type="search"
              defaultValue={q ?? ""}
              placeholder="Name, client, or description"
              maxLength={100}
              autoComplete="off"
              disabled={pending}
              className="pl-9"
              aria-describedby="projects-search-hint"
            />
          </div>
          <p id="projects-search-hint" className="text-xs text-muted-foreground">
            Server-side search across your workspace projects.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {hasQuery ? (
            <Button type="button" variant="ghost" size="sm" asChild>
              <Link
                href={
                  pageSize !== 20
                    ? `/projects?pageSize=${pageSize}`
                    : "/projects"
                }
              >
                Clear
              </Link>
            </Button>
          ) : null}
          <Button type="submit" variant="outline" disabled={pending}>
            {pending ? "Searching…" : "Search"}
          </Button>
        </div>
      </div>
      <span className="sr-only" role="status" aria-live="polite">
        {pending ? "Searching projects" : ""}
      </span>
    </form>
  );
}
