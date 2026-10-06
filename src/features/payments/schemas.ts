import { z } from "zod";

import { moneyToCents } from "@/features/invoices/money";

export const PAYMENT_METHODS = [
  "cash",
  "bank_transfer",
  "card",
  "other",
] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: "Cash",
  bank_transfer: "Bank transfer",
  card: "Card",
  other: "Other",
};

const optionalReference = z
  .string()
  .trim()
  .max(120, "Reference must be 120 characters or fewer")
  .optional()
  .transform((value) => (value && value.length > 0 ? value : undefined));

const optionalNotes = z
  .string()
  .trim()
  .max(2000)
  .optional()
  .transform((value) => (value && value.length > 0 ? value : undefined));

/** Required YYYY-MM-DD calendar date (same convention as invoices). */
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

/**
 * Client-submitted payment payload.
 * Currency, invoice/customer ownership, and remaining balance are never trusted
 * from this shape — the server resolves them from the workspace invoice.
 */
export const paymentInputSchema = z.object({
  invoiceId: z.string().trim().min(1, "Invoice is required").max(64),
  amount: z.coerce
    .number()
    .finite("Enter a valid amount")
    .positive("Amount must be greater than zero")
    .max(1_000_000_000, "Amount is too large")
    .refine(
      (value) => Math.abs(value * 100 - moneyToCents(value)) < 1e-6,
      "Amount cannot have more than two decimal places",
    ),
  paymentDate: dateOnly,
  method: z.enum(PAYMENT_METHODS, {
    error: "Select a valid payment method",
  }),
  reference: optionalReference,
  notes: optionalNotes,
});

export type PaymentInput = z.infer<typeof paymentInputSchema>;

export const paymentListQuerySchema = z.object({
  q: z
    .string()
    .trim()
    .max(100)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined)),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

export type PaymentListQuery = z.infer<typeof paymentListQuerySchema>;

/** Convert YYYY-MM-DD to a UTC midnight Date for storage. */
export function dateOnlyToUtcDate(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year!, month! - 1, day!));
}

/** Format a stored Date as YYYY-MM-DD. */
export function utcDateToDateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}
