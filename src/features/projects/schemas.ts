import { z } from "zod";

export const PROJECT_STATUSES = [
  "planning",
  "active",
  "on_hold",
  "completed",
] as const;

export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  planning: "Planning",
  active: "Active",
  on_hold: "On hold",
  completed: "Completed",
};

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined));

/** Accepts YYYY-MM-DD calendar dates from HTML date inputs. */
const optionalDateOnly = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value && value.length > 0 ? value : undefined))
  .refine(
    (value) => value === undefined || /^\d{4}-\d{2}-\d{2}$/.test(value),
    { message: "Enter a valid date" },
  )
  .refine(
    (value) => {
      if (!value) {
        return true;
      }
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

export const projectInputSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(160),
    description: optionalText(2000),
    status: z.enum(PROJECT_STATUSES, {
      error: "Select a valid status",
    }),
    clientName: optionalText(160),
    startDate: optionalDateOnly,
    dueDate: optionalDateOnly,
  })
  .superRefine((data, ctx) => {
    if (data.startDate && data.dueDate && data.dueDate < data.startDate) {
      ctx.addIssue({
        code: "custom",
        path: ["dueDate"],
        message: "Due date cannot be earlier than start date",
      });
    }
  });

export type ProjectInput = z.infer<typeof projectInputSchema>;

export const projectListQuerySchema = z.object({
  q: z
    .string()
    .trim()
    .max(100)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined)),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

export type ProjectListQuery = z.infer<typeof projectListQuerySchema>;

/** Convert YYYY-MM-DD to a UTC midnight Date for storage. */
export function dateOnlyToUtcDate(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year!, month! - 1, day!));
}

/** Format a stored Date as YYYY-MM-DD. */
export function utcDateToDateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}
