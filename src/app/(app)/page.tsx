import Link from "next/link";

import { EmptyState } from "@/components/feedback/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { requireVerifiedPageSession } from "@/server/auth/session";
import { cn } from "@/lib/utils/cn";

function formatRole(role: string) {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

export default async function OverviewPage() {
  const session = await requireVerifiedPageSession();
  const roleLabel = formatRole(session.membership.role);

  const foundationAreas = [
    {
      title: "Identity",
      description: "Secure sessions with email sign-in and OAuth boundary.",
      metaLabel: "Status",
      metaValue: session.user.emailVerified ? "Verified" : "Signed in",
    },
    {
      title: "Workspace",
      description: "Default workspace with trusted membership context.",
      metaLabel: "Active",
      metaValue: session.workspace.name,
    },
    {
      title: "Authorization",
      description: "Role and permissions derived from the server session.",
      metaLabel: "Role",
      metaValue: roleLabel,
    },
    {
      title: "Demo mode",
      description: "Read-only portfolio identity with server-side restrictions.",
      metaLabel: "Access",
      metaValue: session.user.isDemo ? "Read-only" : "Standard",
    },
  ] as const;

  return (
    <div className="space-y-8 sm:space-y-10">
      <section className="space-y-4" aria-labelledby="overview-heading">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">Phase 2</Badge>
          <Badge variant="outline">Identity & workspaces</Badge>
          {session.user.isDemo ? (
            <Badge variant="warning">Demo account</Badge>
          ) : null}
        </div>
        <div className="max-w-2xl space-y-2">
          <h2
            id="overview-heading"
            className="text-2xl font-semibold tracking-tight text-foreground sm:text-[1.75rem] sm:leading-tight"
          >
            Welcome, {session.user.name}
          </h2>
          <p className="text-sm leading-6 text-muted-foreground sm:text-[0.9375rem] sm:leading-7">
            You are signed in to{" "}
            <span className="font-medium text-foreground">
              {session.workspace.name}
            </span>{" "}
            as{" "}
            <span className="font-medium text-foreground">
              {session.membership.role}
            </span>
            . Customers is available; other business modules remain placeholders.
          </p>
        </div>
      </section>

      <section className="space-y-3" aria-labelledby="foundation-heading">
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <h3
              id="foundation-heading"
              className="text-sm font-semibold tracking-tight text-foreground"
            >
              Workspace foundation
            </h3>
            <p className="mt-1 text-xs leading-5 text-muted-foreground sm:text-sm">
              Trusted identity and access context for this session.
            </p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {foundationAreas.map((area) => (
            <Card
              key={area.title}
              className="transition-ui hover:border-primary/25"
            >
              <CardHeader className="gap-2 p-5">
                <CardTitle className="text-sm">{area.title}</CardTitle>
                <CardDescription className="text-xs leading-5 sm:text-sm sm:leading-6">
                  {area.description}
                </CardDescription>
              </CardHeader>
              <div className="border-t border-border px-5 py-3">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-[11px] font-medium tracking-[0.08em] text-muted-foreground uppercase">
                    {area.metaLabel}
                  </span>
                  <span
                    className={cn(
                      "truncate text-sm font-semibold text-foreground",
                      area.title === "Workspace" &&
                        "max-w-[10rem] sm:max-w-[12rem]",
                    )}
                    title={area.metaValue}
                  >
                    {area.metaValue}
                  </span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section
        className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,0.85fr)]"
        aria-label="Workspace details and session"
      >
        <Card>
          <CardHeader className="p-5 sm:p-6">
            <CardTitle>Workspace details</CardTitle>
            <CardDescription>
              Profile fields used across future modules. No fabricated business
              metrics are shown here.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 p-5 pt-0 sm:p-6 sm:pt-0">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="demo-email">Email</Label>
                <Input
                  id="demo-email"
                  type="email"
                  placeholder="you@company.com"
                  autoComplete="email"
                  defaultValue={session.user.email}
                  readOnly={session.user.isDemo}
                  title={
                    session.user.isDemo
                      ? "Demo accounts are read-only"
                      : undefined
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="demo-workspace">Workspace name</Label>
                <Input
                  id="demo-workspace"
                  placeholder="Acme Operations"
                  autoComplete="organization"
                  defaultValue={session.workspace.name}
                  readOnly={session.user.isDemo}
                  title={
                    session.user.isDemo
                      ? "Demo accounts are read-only"
                      : undefined
                  }
                />
              </div>
            </div>
            {session.user.isDemo ? (
              <p className="text-xs leading-5 text-muted-foreground">
                Demo accounts are read-only. Editing workspace data is disabled.
              </p>
            ) : null}

            <div className="space-y-3 border-t border-border pt-5">
              <p className="text-[11px] font-medium tracking-[0.08em] text-muted-foreground uppercase">
                UI primitives
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <Button type="button">Primary</Button>
                <Button type="button" variant="secondary">
                  Secondary
                </Button>
                <Button type="button" variant="outline">
                  Outline
                </Button>
                <Button type="button" variant="ghost">
                  Ghost
                </Button>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button type="button" variant="outline" size="sm">
                      Tooltip
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Calm, accessible guidance</TooltipContent>
                </Tooltip>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button type="button" variant="outline">
                      Open dialog foundation
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Dialog foundation</DialogTitle>
                      <DialogDescription>
                        Accessible modal behavior is provided by Radix
                        primitives and styled with SYLQEN tokens.
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                      <DialogClose asChild>
                        <Button type="button" variant="outline">
                          Close
                        </Button>
                      </DialogClose>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-5 sm:p-6">
            <CardTitle>Session context</CardTitle>
            <CardDescription>
              Values derived on the server from your session cookie.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 pt-0 sm:p-6 sm:pt-0">
            <dl className="space-y-0 text-sm">
              <div className="flex items-start justify-between gap-4 border-b border-border py-3">
                <dt className="shrink-0 text-muted-foreground">Email</dt>
                <dd className="min-w-0 truncate text-right font-medium text-foreground">
                  {session.user.email}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-4 border-b border-border py-3">
                <dt className="shrink-0 text-muted-foreground">Role</dt>
                <dd className="font-medium text-foreground">{roleLabel}</dd>
              </div>
              <div className="flex items-start justify-between gap-4 border-b border-border py-3">
                <dt className="shrink-0 text-muted-foreground">Permissions</dt>
                <dd className="font-medium tabular-nums text-foreground">
                  {session.membership.permissions.length}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-4 py-3">
                <dt className="shrink-0 text-muted-foreground">Account type</dt>
                <dd className="font-medium text-foreground">
                  {session.user.isDemo ? "Demo" : "Standard"}
                </dd>
              </div>
            </dl>
            <p className="mt-2 rounded-[var(--radius-md)] bg-muted/70 px-3 py-2.5 text-xs leading-5 text-muted-foreground">
              Activity feeds, KPIs, and module tables will appear in this column
              when product modules ship.
            </p>
          </CardContent>
        </Card>
      </section>

      <EmptyState
        title="More modules coming"
        description="Customers is live. Finance, projects, AI assistance, and related product areas will land in later phases on this authenticated workspace core."
        action={
          <Button asChild variant="outline">
            <Link href="/customers">Open Customers</Link>
          </Button>
        }
      />
    </div>
  );
}
