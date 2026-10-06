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
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { requireVerifiedPageSession } from "@/server/auth/session";

const foundationAreas = [
  {
    title: "Identity",
    description: "Verified email, Google OAuth boundary, and secure sessions.",
  },
  {
    title: "Workspaces",
    description: "Default workspace creation with owner membership.",
  },
  {
    title: "Authorization",
    description: "Role and permission checks derived from trusted session context.",
  },
  {
    title: "Demo mode",
    description: "Read-only portfolio demo identity with server-side restrictions.",
  },
] as const;

export default async function OverviewPage() {
  const session = await requireVerifiedPageSession();

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">Phase 2</Badge>
          <Badge variant="outline">Identity & workspaces</Badge>
          {session.user.isDemo ? <Badge variant="warning">Demo account</Badge> : null}
        </div>
        <div className="max-w-2xl">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Welcome, {session.user.name}
          </h2>
          <p className="mt-3 text-sm leading-7 text-muted-foreground sm:text-base">
            You are signed in to{" "}
            <span className="font-medium text-foreground">
              {session.workspace.name}
            </span>{" "}
            as <span className="font-medium text-foreground">{session.membership.role}</span>.
            Business modules remain placeholders until later phases.
          </p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {foundationAreas.map((area) => (
          <Card key={area.title} className="transition-ui hover:shadow-elevated">
            <CardHeader>
              <CardTitle>{area.title}</CardTitle>
              <CardDescription>{area.description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>Component foundation</CardTitle>
            <CardDescription>
              Interactive primitives used across future modules. No fake business
              data is shown here.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <Button>Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm">
                    Tooltip
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Calm, accessible guidance</TooltipContent>
              </Tooltip>
            </div>

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

            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline">Open dialog foundation</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Dialog foundation</DialogTitle>
                  <DialogDescription>
                    Accessible modal behavior is provided by Radix primitives and
                    styled with SYLQEN tokens.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline">Close</Button>
                  </DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Session context</CardTitle>
            <CardDescription>
              Trusted values derived on the server from your session cookie.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between gap-4 border-b border-border pb-3">
              <span className="text-muted-foreground">Email</span>
              <span className="font-medium">{session.user.email}</span>
            </div>
            <div className="flex justify-between gap-4 border-b border-border pb-3">
              <span className="text-muted-foreground">Role</span>
              <span className="font-medium">{session.membership.role}</span>
            </div>
            <div className="flex justify-between gap-4 border-b border-border pb-3">
              <span className="text-muted-foreground">Permissions</span>
              <span className="text-right font-medium">
                {session.membership.permissions.length}
              </span>
            </div>
            <div className="pt-1">
              <Skeleton className="h-24 w-full" />
            </div>
          </CardContent>
        </Card>
      </section>

      <EmptyState
        title="No business modules yet"
        description="CRM, finance, projects, AI assistance, and related product areas will land in later phases on top of this authenticated workspace core."
        action={
          <Button variant="outline" disabled>
            Modules arrive in Phase 3+
          </Button>
        }
      />
    </div>
  );
}
