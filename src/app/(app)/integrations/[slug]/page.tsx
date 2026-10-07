import { notFound } from "next/navigation";

import { ErrorState } from "@/components/feedback/error-state";
import { Badge } from "@/components/ui/badge";
import { IntegrationDetailView } from "@/features/integrations/integration-detail";
import { isAppError, toAppError } from "@/lib/errors/app-error";
import { requireVerifiedPageSession } from "@/server/auth/session";
import { getIntegrationDefinitionBySlug } from "@/server/integrations/catalog";
import { getIntegrationBySlugForSession } from "@/server/integrations/service";

type IntegrationDetailPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function IntegrationDetailPage({
  params,
}: IntegrationDetailPageProps) {
  const session = await requireVerifiedPageSession();
  const { slug } = await params;

  if (!getIntegrationDefinitionBySlug(slug)) {
    notFound();
  }

  let item;
  try {
    item = getIntegrationBySlugForSession(session, slug);
  } catch (error) {
    const appError = toAppError(error);
    if (appError.code === "NOT_FOUND") {
      notFound();
    }
    return (
      <div className="space-y-6 sm:space-y-8">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">
          Integration
        </h2>
        <ErrorState
          title="Unable to load integration"
          description={
            isAppError(error)
              ? appError.userMessage
              : "Something went wrong while loading this integration."
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <section className="space-y-2" aria-labelledby="integration-detail-heading">
        <div className="flex flex-wrap items-center gap-2">
          <h2
            id="integration-detail-heading"
            className="text-2xl font-semibold tracking-tight text-foreground sm:text-[1.75rem] sm:leading-tight"
          >
            {item.name}
          </h2>
          {session.user.isDemo ? (
            <Badge variant="warning">Demo read-only</Badge>
          ) : null}
        </div>
        <p className="text-sm text-muted-foreground">
          Integration detail · {session.workspace.name}
        </p>
      </section>
      <IntegrationDetailView item={item} />
    </div>
  );
}
