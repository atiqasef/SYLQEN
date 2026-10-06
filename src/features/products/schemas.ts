import { z } from "zod";

/** Normalize SKU for uniqueness: trim, uppercase, collapse internal whitespace to `-`. */
export function normalizeSku(value: string): string {
  return value
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "-")
    .replace(/[^A-Z0-9._-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const optionalUnit = z
  .string()
  .trim()
  .max(40)
  .optional()
  .transform((value) => (value && value.length > 0 ? value : undefined));

const optionalDescription = z
  .string()
  .trim()
  .max(2000)
  .optional()
  .transform((value) => (value && value.length > 0 ? value : undefined));

export const productInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(160),
  sku: z
    .string()
    .trim()
    .min(1, "SKU is required")
    .max(64, "SKU must be 64 characters or fewer")
    .transform(normalizeSku)
    .refine((value) => value.length > 0, {
      message: "SKU is required",
    })
    .refine((value) => value.length <= 64, {
      message: "SKU must be 64 characters or fewer",
    }),
  description: optionalDescription,
  price: z.coerce
    .number()
    .finite("Enter a valid price")
    .min(0, "Price cannot be negative")
    .max(1_000_000_000, "Price is too large"),
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
  unit: optionalUnit,
});

export type ProductInput = z.infer<typeof productInputSchema>;

export const productListQuerySchema = z.object({
  q: z
    .string()
    .trim()
    .max(100)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined)),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

export type ProductListQuery = z.infer<typeof productListQuerySchema>;
