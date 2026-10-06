import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PaymentForm } from "@/features/payments/payment-form";
import { requireVerifiedPageSession } from "@/server/auth/session";
import { listInvoicesForSession } from "@/server/invoices/service";
import { getInvoicePaymentSummariesForSession } from "@/server/payments/service";
import { remainingBalance } from "@/server/payments/repository";

type NewPaymentPageProps = {
  searchParams: Promise<{
    invoiceId?: string | string[];
  }>;
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function NewPaymentPage({
  searchParams,
}: NewPaymentPageProps) {
  const session = await requireVerifiedPageSession();
  const canCreate = session.membership.permissions.includes("payments.create");
  const params = await searchParams;
  const initialInvoiceId = firstParam(params.invoiceId);

  let payableOptions: {
    id: string;
    invoiceNumber: string;
    customerNameSnapshot: string;
    total: number;
    currency: string;
    amountPaid: number;
    remaining: number;
  }[] = [];

  if (canCreate) {
    const invoices = await listInvoicesForSession(session, {
      page: 1,
      pageSize: 50,
    });

    const paidByInvoice = await getInvoicePaymentSummariesForSession(
      session,
      invoices.items.map((invoice) => invoice.id),
    );

    payableOptions = invoices.items
      .map((invoice) => {
        const paid = paidByInvoice.get(invoice.id) ?? {
          amountPaid: 0,
          paymentCount: 0,
        };
        return {
          id: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          customerNameSnapshot: invoice.customerNameSnapshot,
          total: invoice.total,
          currency: invoice.currency,
          amountPaid: paid.amountPaid,
          remaining: Math.max(
            0,
            remainingBalance(invoice.total, paid.amountPaid),
          ),
        };
      })
      .filter((invoice) => invoice.remaining > 0);
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <section className="space-y-3" aria-labelledby="new-payment-heading">
        <nav aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
            <li>
              <Link
                href="/payments"
                className="transition-ui hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Payments
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li className="font-medium text-foreground">Record</li>
          </ol>
        </nav>
        <div className="flex flex-wrap items-center gap-2">
          <h2
            id="new-payment-heading"
            className="text-2xl font-semibold tracking-tight text-foreground sm:text-[1.75rem] sm:leading-tight"
          >
            Record payment
          </h2>
          {session.user.isDemo ? (
            <Badge variant="warning">Demo read-only</Badge>
          ) : null}
        </div>
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-[0.9375rem] sm:leading-7">
          Record a payment received in{" "}
          <span className="font-medium text-foreground">
            {session.workspace.name}
          </span>
          . Currency and remaining balance come from the invoice on the server.
        </p>
      </section>

      {!canCreate ? (
        <div className="space-y-4 rounded-[var(--radius-lg)] border border-border bg-card p-5 shadow-panel">
          <p role="status" className="text-sm leading-6 text-muted-foreground">
            You do not have permission to record payments
            {session.user.isDemo ? ". Demo accounts are read-only." : "."}
          </p>
          <Button asChild variant="outline">
            <Link href="/payments">Back to payments</Link>
          </Button>
        </div>
      ) : (
        <PaymentForm
          invoices={payableOptions}
          initialInvoiceId={initialInvoiceId}
          cancelHref="/payments"
        />
      )}
    </div>
  );
}
