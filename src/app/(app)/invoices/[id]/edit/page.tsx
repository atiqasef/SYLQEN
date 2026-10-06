import Link from "next/link";
import { notFound } from "next/navigation";

import { ErrorState } from "@/components/feedback/error-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { InvoiceForm } from "@/features/invoices/invoice-form";
import { InvoiceStatusBadge } from "@/features/invoices/invoice-status-badge";
import { isAppError, toAppError } from "@/lib/errors/app-error";
import { requireVerifiedPageSession } from "@/server/auth/session";
import { listCustomersForSession } from "@/server/customers/service";
import { getInvoiceForSession } from "@/server/invoices/service";
import { listProductsForSession } from "@/server/products/service";

type EditInvoicePageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditInvoicePage({
  params,
}: EditInvoicePageProps) {
  const session = await requireVerifiedPageSession();
  const { id } = await params;
  const canUpdate = session.membership.permissions.includes("invoices.update");

  let invoice;
  try {
    invoice = await getInvoiceForSession(session, id);
  } catch (error) {
    if (isAppError(error) && error.code === "NOT_FOUND") {
      notFound();
    }
    const appError = toAppError(error);
    return (
      <ErrorState
        title="Unable to load invoice"
        description={appError.userMessage}
      />
    );
  }

  const [customers, products] = await Promise.all([
    listCustomersForSession(session, { page: 1, pageSize: 50 }),
    listProductsForSession(session, { page: 1, pageSize: 50 }),
  ]);

  return (
    <div className="space-y-6 sm:space-y-8">
      <section className="space-y-3" aria-labelledby="edit-invoice-heading">
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
            <li className="min-w-0">
              <Link
                href={`/invoices/${invoice.id}`}
                className="truncate font-mono transition-ui hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {invoice.invoiceNumber}
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li className="font-medium text-foreground">Edit</li>
          </ol>
        </nav>
        <div className="flex flex-wrap items-center gap-2">
          <h2
            id="edit-invoice-heading"
            className="text-2xl font-semibold tracking-tight text-foreground sm:text-[1.75rem] sm:leading-tight"
          >
            Edit invoice
          </h2>
          <InvoiceStatusBadge status={invoice.status} />
          {session.user.isDemo ? (
            <Badge variant="warning">Demo read-only</Badge>
          ) : null}
        </div>
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-[0.9375rem] sm:leading-7">
          Updating{" "}
          <span className="font-mono font-medium tracking-wide text-foreground">
            {invoice.invoiceNumber}
          </span>{" "}
          for{" "}
          <span className="font-medium text-foreground">
            {invoice.customerNameSnapshot}
          </span>
          . Line-item prices are re-resolved from current products on save.
        </p>
      </section>

      {!canUpdate ? (
        <div className="space-y-4 rounded-[var(--radius-lg)] border border-border bg-card p-5 shadow-panel">
          <p role="status" className="text-sm leading-6 text-muted-foreground">
            You do not have permission to edit invoices
            {session.user.isDemo ? ". Demo accounts are read-only." : "."}
          </p>
          <Button asChild variant="outline">
            <Link href={`/invoices/${invoice.id}`}>Back to invoice</Link>
          </Button>
        </div>
      ) : (
        <InvoiceForm
          mode="edit"
          invoiceId={invoice.id}
          invoiceNumber={invoice.invoiceNumber}
          cancelHref={`/invoices/${invoice.id}`}
          customers={(() => {
            const options = customers.items.map((customer) => ({
              id: customer.id,
              name: customer.name,
            }));
            if (!options.some((customer) => customer.id === invoice.customerId)) {
              options.unshift({
                id: invoice.customerId,
                name: invoice.customerNameSnapshot,
              });
            }
            return options;
          })()}
          products={(() => {
            const options = products.items.map((product) => ({
              id: product.id,
              name: product.name,
              sku: product.sku,
              price: product.price,
              currency: product.currency,
            }));
            for (const item of invoice.lineItems) {
              if (!options.some((product) => product.id === item.productId)) {
                options.push({
                  id: item.productId,
                  name: item.productNameSnapshot,
                  sku: item.skuSnapshot,
                  price: item.unitPrice,
                  currency: invoice.currency,
                });
              }
            }
            return options;
          })()}
          initialValues={{
            customerId: invoice.customerId,
            status: invoice.status,
            issueDate: invoice.issueDate,
            dueDate: invoice.dueDate,
            currency: invoice.currency,
            notes: invoice.notes,
            lineItems: invoice.lineItems.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
            })),
          }}
        />
      )}
    </div>
  );
}
