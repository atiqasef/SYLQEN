import { z } from "zod";

export const INVOICE_STATUSES = ["draft", "sent", "paid", "overdue"] as const;

export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  draft: "Draft",
  sent: "Sent",
  paid: "Paid",
  overdue: "Overdue",
};

const optionalNotes = z
  .string()
  .trim()
  .max(2000)
  .optional()
  .transform((value) => (value && value.length > 0 ? value : undefined));

/** Required YYYY-MM-DD calendar date. */
const dateOnly = z
  .string()
  .trim()
  .min(1, "Date is required")
  .refine((value) => /^\d{4}-\d{2}-\d{2}$/.test(value), {
    message: "Enter a valid date",
  })
  .refine(
    (value) => {
      const [year, month, day] = value.split("-").map(Number);
      const date = new Date(Date.UTC(year!, month! - 1, day!));
      return (
        !Number.isNaN(date.getTime()) &&
        date.getUTCFullYear() === year &&
        date.getUTCMonth() === month! - 1 &&
        date.getUTCDate() === day
      );
    },
    { message: "Enter a valid date" },
  );

export const invoiceLineItemInputSchema = z.object({
  productId: z.string().trim().min(1, "Product is required").max(64),
  quantity: z.coerce
    .number()
    .finite("Enter a valid quantity")
    .positive("Quantity must be greater than zero")
    .max(100_000, "Quantity is too large"),
});

export type InvoiceLineItemInput = z.infer<typeof invoiceLineItemInputSchema>;

/**
 * Client-submitted invoice payload.
 * Totals, prices, names, SKUs, and invoice numbers are never trusted from this shape.
 */
export const invoiceInputSchema = z
  .object({
    customerId: z.string().trim().min(1, "Customer is required").max(64),
    status: z.enum(INVOICE_STATUSES, {
      error: "Select a valid status",
    }),
    issueDate: dateOnly,
    dueDate: dateOnly,
    currency: z
      .string()
      .trim()
      .transform((value) => value.toUpperCase())
      .pipe(
        z
          .string()
          .length(3, "Currency must be a 3-letter code")
          .regex(/^[A-Z]{3}$/, "Currency must be a 3-letter code"),
      ),
    notes: optionalNotes,
    lineItems: z
      .array(invoiceLineItemInputSchema)
      .min(1, "Add at least one line item")
      .max(50, "Too many line items"),
  })
  .superRefine((data, ctx) => {
    if (data.dueDate < data.issueDate) {
      ctx.addIssue({
        code: "custom",
        path: ["dueDate"],
        message: "Due date cannot be earlier than issue date",
      });
    }
  });

export type InvoiceInput = z.infer<typeof invoiceInputSchema>;

export const invoiceListQuerySchema = z.object({
  q: z
    .string()
    .trim()
    .max(100)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined)),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

export type InvoiceListQuery = z.infer<typeof invoiceListQuerySchema>;

/** Convert YYYY-MM-DD to a UTC midnight Date for storage. */
export function dateOnlyToUtcDate(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year!, month! - 1, day!));
}

/** Format a stored Date as YYYY-MM-DD. */
export function utcDateToDateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export function formatInvoiceNumber(sequence: number): string {
  return `INV-${String(sequence).padStart(6, "0")}`;
}
