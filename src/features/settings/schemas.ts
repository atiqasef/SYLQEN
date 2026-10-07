import { z } from "zod";

export const updateWorkspaceNameSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Workspace name must be at least 2 characters")
    .max(80, "Workspace name must be at most 80 characters"),
});

export type UpdateWorkspaceNameInput = z.infer<typeof updateWorkspaceNameSchema>;

export const updateAccountNameSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(120, "Name must be at most 120 characters"),
});

export type UpdateAccountNameInput = z.infer<typeof updateAccountNameSchema>;
