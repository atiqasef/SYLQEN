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

const foundationAreas = [
  {
    title: "Design system",
    description: "Tokens, typography, and accessible UI primitives.",
  },
  {
    title: "App shell",
    description: "Responsive navigation, header, and theme controls.",
  },
  {
    title: "Server boundaries",
    description: "Auth, database, AI, logging, and env configuration stubs.",
  },
  {
    title: "Quality baseline",
    description: "TypeScript strictness, linting, tests, and accessibility.",
  },
] as const;

export default function OverviewPage() {
  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">Phase 1</Badge>
          <Badge variant="outline">Foundation only</Badge>
        </div>
        <div className="max-w-2xl">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            SYLQEN foundation is ready
          </h2>
          <p className="mt-3 text-sm leading-7 text-muted-foreground sm:text-base">
            This workspace establishes the product shell, design system, and
            architectural boundaries for a multi-tenant Business Operating
            System. Business modules are intentionally not implemented yet.
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
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="demo-workspace">Workspace name</Label>
                <Input
                  id="demo-workspace"
                  placeholder="Acme Operations"
                  autoComplete="organization"
                />
              </div>
            </div>

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
            <CardTitle>Loading foundation</CardTitle>
            <CardDescription>
              Skeleton patterns respect reduced motion preferences.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="mt-4 h-24 w-full" />
          </CardContent>
        </Card>
      </section>

      <EmptyState
        title="No business modules yet"
        description="CRM, finance, projects, AI assistance, and related product areas will land in later phases on top of this foundation."
        action={
          <Button variant="outline" disabled>
            Modules arrive in Phase 2+
          </Button>
        }
      />
    </div>
  );
}
