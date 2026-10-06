import Link from "next/link";
import { notFound } from "next/navigation";

import { ErrorState } from "@/components/feedback/error-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { isAppError, toAppError } from "@/lib/errors/app-error";
import { requireVerifiedPageSession } from "@/server/auth/session";
import { getProductForSession } from "@/server/products/service";
import { cn } from "@/lib/utils/cn";

type ProductDetailPageProps = {
  params: Promise<{ id: string }>;
};

function formatDate(iso: string) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function formatPrice(price: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(price);
  } catch {
    return `${price} ${currency}`;
  }
}

function productMark(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return "?";
  }
  if (parts.length === 1) {
    return parts[0]!.slice(0, 2).toUpperCase();
  }
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
}

function DetailValue({
  value,
  empty = "Not provided",
  multiline = false,
  mono = false,
}: {
  value?: string | null;
  empty?: string;
  multiline?: boolean;
  mono?: boolean;
}) {
  if (!value) {
    return <span className="font-normal text-muted-foreground/80">{empty}</span>;
  }

  return (
    <span
      className={cn(
        "font-medium text-foreground",
        multiline && "whitespace-pre-wrap break-words",
        mono && "font-mono tracking-wide",
      )}
    >
      {value}
    </span>
  );
}

export default async function ProductDetailPage({
  params,
}: ProductDetailPageProps) {
  const session = await requireVerifiedPageSession();
  const { id } = await params;
  const canUpdate = session.membership.permissions.includes("products.update");

  let product;
  try {
    product = await getProductForSession(session, id);
  } catch (error) {
    if (isAppError(error) && error.code === "NOT_FOUND") {
      notFound();
    }
    const appError = toAppError(error);
    return (
      <ErrorState
        title="Unable to load product"
        description={appError.userMessage}
      />
    );
  }

  const formattedPrice = formatPrice(product.price, product.currency);
  const metaItems = [
    { label: "SKU", value: product.sku },
    { label: "Price", value: formattedPrice },
    { label: "Unit", value: product.unit },
  ];

  return (
    <div className="space-y-6 sm:space-y-8">
      <section className="space-y-4" aria-labelledby="product-detail-heading">
        <nav aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
            <li>
              <Link
                href="/products"
                className="transition-ui hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Products
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li className="truncate font-medium text-foreground">{product.name}</li>
          </ol>
        </nav>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-3 sm:gap-4">
            <div
              className="flex size-12 shrink-0 items-center justify-center rounded-[var(--radius-md)] border border-border bg-muted text-sm font-semibold tracking-wide text-foreground sm:size-14 sm:text-base"
              aria-hidden="true"
            >
              {productMark(product.name)}
            </div>
            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h2
                  id="product-detail-heading"
                  className="truncate text-2xl font-semibold tracking-tight text-foreground sm:text-[1.75rem] sm:leading-tight"
                >
                  {product.name}
                </h2>
                {session.user.isDemo ? (
                  <Badge variant="warning">Demo read-only</Badge>
                ) : null}
              </div>
              <p className="truncate font-mono text-sm tracking-wide text-muted-foreground">
                {product.sku}
              </p>
              <p className="text-lg font-semibold tabular-nums tracking-tight text-foreground">
                {formattedPrice}
                {product.unit ? (
                  <span className="ml-1.5 text-sm font-normal text-muted-foreground">
                    / {product.unit}
                  </span>
                ) : null}
              </p>
              <ul className="flex flex-wrap gap-2 pt-0.5">
                {metaItems.map((item) =>
                  item.value ? (
                    <li key={item.label}>
                      <span className="inline-flex max-w-full items-center gap-1.5 rounded-[var(--radius-sm)] border border-border bg-muted/50 px-2 py-1 text-xs text-muted-foreground">
                        <span className="font-medium text-foreground/80">
                          {item.label}
                        </span>
                        <span
                          className={cn(
                            "truncate",
                            item.label === "SKU" && "font-mono tracking-wide",
                            item.label === "Price" && "tabular-nums",
                          )}
                        >
                          {item.value}
                        </span>
                      </span>
                    </li>
                  ) : null,
                )}
              </ul>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 sm:shrink-0">
            <Button asChild variant="outline">
              <Link href="/products">Back to list</Link>
            </Button>
            {canUpdate ? (
              <Button asChild>
                <Link href={`/products/${product.id}/edit`}>Edit</Link>
              </Button>
            ) : null}
          </div>
        </div>

        {session.user.isDemo && !canUpdate ? (
          <p
            role="status"
            className="rounded-[var(--radius-md)] border border-border bg-muted/60 px-3 py-2 text-sm leading-6 text-muted-foreground"
          >
            Demo accounts can view product details, but cannot edit them.
          </p>
        ) : null}
      </section>

      <div className="mx-auto grid max-w-3xl gap-4">
        <section
          className="overflow-hidden rounded-[var(--radius-lg)] border border-border bg-card shadow-panel"
          aria-labelledby="product-info-heading"
        >
          <div className="border-b border-border px-4 py-3.5 sm:px-5">
            <h3
              id="product-info-heading"
              className="text-sm font-semibold tracking-tight text-foreground"
            >
              Catalog details
            </h3>
          </div>
          <dl className="divide-y divide-border">
            {[
              { label: "SKU", value: product.sku, mono: true },
              { label: "Price", value: formattedPrice },
              { label: "Currency", value: product.currency, mono: true },
              { label: "Unit", value: product.unit },
            ].map((field) => (
              <div
                key={field.label}
                className="grid gap-1 px-4 py-3.5 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-4 sm:px-5"
              >
                <dt className="text-sm text-muted-foreground">{field.label}</dt>
                <dd className="min-w-0 text-sm">
                  <DetailValue
                    value={field.value}
                    mono={"mono" in field && field.mono}
                  />
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <section
          className="overflow-hidden rounded-[var(--radius-lg)] border border-border bg-card shadow-panel"
          aria-labelledby="product-description-heading"
        >
          <div className="border-b border-border px-4 py-3.5 sm:px-5">
            <h3
              id="product-description-heading"
              className="text-sm font-semibold tracking-tight text-foreground"
            >
              Description
            </h3>
          </div>
          <div className="px-4 py-4 sm:px-5">
            <p className="text-sm leading-6">
              <DetailValue
                value={product.description}
                multiline
                empty="No description yet"
              />
            </p>
          </div>
        </section>

        <section
          className="overflow-hidden rounded-[var(--radius-lg)] border border-border bg-card shadow-panel"
          aria-labelledby="product-record-heading"
        >
          <div className="border-b border-border px-4 py-3.5 sm:px-5">
            <h3
              id="product-record-heading"
              className="text-sm font-semibold tracking-tight text-foreground"
            >
              Record
            </h3>
          </div>
          <dl className="divide-y divide-border">
            <div className="grid gap-1 px-4 py-3.5 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-4 sm:px-5">
              <dt className="text-sm text-muted-foreground">Created</dt>
              <dd className="text-sm font-medium tabular-nums text-foreground">
                {formatDate(product.createdAt)}
              </dd>
            </div>
            <div className="grid gap-1 px-4 py-3.5 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-4 sm:px-5">
              <dt className="text-sm text-muted-foreground">Updated</dt>
              <dd className="text-sm font-medium tabular-nums text-foreground">
                {formatDate(product.updatedAt)}
              </dd>
            </div>
          </dl>
        </section>
      </div>
    </div>
  );
}
