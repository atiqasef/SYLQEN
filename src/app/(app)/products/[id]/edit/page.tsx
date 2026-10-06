import Link from "next/link";
import { notFound } from "next/navigation";

import { ErrorState } from "@/components/feedback/error-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProductForm } from "@/features/products/product-form";
import { isAppError, toAppError } from "@/lib/errors/app-error";
import { requireVerifiedPageSession } from "@/server/auth/session";
import { getProductForSession } from "@/server/products/service";

type EditProductPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditProductPage({
  params,
}: EditProductPageProps) {
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

  return (
    <div className="space-y-6 sm:space-y-8">
      <section className="space-y-3" aria-labelledby="edit-product-heading">
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
            <li className="min-w-0">
              <Link
                href={`/products/${product.id}`}
                className="truncate transition-ui hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {product.name}
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li className="font-medium text-foreground">Edit</li>
          </ol>
        </nav>
        <div className="flex flex-wrap items-center gap-2">
          <h2
            id="edit-product-heading"
            className="text-2xl font-semibold tracking-tight text-foreground sm:text-[1.75rem] sm:leading-tight"
          >
            Edit product
          </h2>
          {session.user.isDemo ? (
            <Badge variant="warning">Demo read-only</Badge>
          ) : null}
        </div>
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-[0.9375rem] sm:leading-7">
          Updating{" "}
          <span className="font-medium text-foreground">{product.name}</span>
          <span className="text-muted-foreground">
            {" "}
            ({product.sku})
          </span>
          . Changes replace the saved record after server validation.
        </p>
      </section>

      {!canUpdate ? (
        <div className="space-y-4 rounded-[var(--radius-lg)] border border-border bg-card p-5 shadow-panel">
          <p role="status" className="text-sm leading-6 text-muted-foreground">
            You do not have permission to edit products
            {session.user.isDemo ? ". Demo accounts are read-only." : "."}
          </p>
          <Button asChild variant="outline">
            <Link href={`/products/${product.id}`}>Back to product</Link>
          </Button>
        </div>
      ) : (
        <ProductForm
          mode="edit"
          productId={product.id}
          cancelHref={`/products/${product.id}`}
          initialValues={{
            name: product.name,
            sku: product.sku,
            description: product.description,
            price: product.price,
            currency: product.currency,
            unit: product.unit,
          }}
        />
      )}
    </div>
  );
}
