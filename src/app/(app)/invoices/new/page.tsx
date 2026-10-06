import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { InvoiceForm } from "@/features/invoices/invoice-form";
import { requireVerifiedPageSession } from "@/server/auth/session";
import { listCustomersForSession } from "@/server/customers/service";
import { listProductsForSession } from "@/server/products/service";

export default async function NewInvoicePage() {
  const session = await requireVerifiedPageSession();
  const canCreate = session.membership.permissions.includes("invoices.create");

  const [customers, products] = await Promise.all([
    listCustomersForSession(session, { page: 1, pageSize: 50 }),
    listProductsForSession(session, { page: 1, pageSize: 50 }),
  ]);

  return (
    <div className="space-y-6 sm:space-y-8">
      <section className="space-y-3" aria-labelledby="new-invoice-heading">
        <nav aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
            <li>
              <Link
                href="/invoices"
                className="transition-ui hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Invoices
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li className="font-medium text-foreground">Add</li>
          </ol>
        </nav>
        <div className="flex flex-wrap items-center gap-2">
          <h2
            id="new-invoice-heading"
            className="text-2xl font-semibold tracking-tight text-foreground sm:text-[1.75rem] sm:leading-tight"
          >
            Add invoice
          </h2>
          {session.user.isDemo ? (
            <Badge variant="warning">Demo read-only</Badge>
          ) : null}
        </div>
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
          Create an invoice in{" "}
          <span className="font-medium text-foreground">
            {session.workspace.name}
          </span>
          . Invoice numbers and totals are assigned on the server.
        </p>
      </section>

      {!canCreate ? (
        <div className="space-y-4 rounded-[var(--radius-lg)] border border-border bg-card p-5 shadow-panel">
          <p role="status" className="text-sm leading-6 text-muted-foreground">
            You do not have permission to create invoices
            {session.user.isDemo ? ". Demo accounts are read-only." : "."}
          </p>
          <Button asChild variant="outline">
            <Link href="/invoices">Back to invoices</Link>
          </Button>
        </div>
      ) : (
        <InvoiceForm
          mode="create"
          cancelHref="/invoices"
          customers={customers.items.map((customer) => ({
            id: customer.id,
            name: customer.name,
          }))}
          products={products.items.map((product) => ({
            id: product.id,
            name: product.name,
            sku: product.sku,
            price: product.price,
            currency: product.currency,
          }))}
        />
      )}
    </div>
  );
}
