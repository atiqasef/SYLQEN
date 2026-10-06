import "server-only";

import { AppError } from "@/lib/errors/app-error";
import { parseWithSchema } from "@/lib/validation/result";
import {
  productInputSchema,
  productListQuerySchema,
  type ProductInput,
} from "@/features/products/schemas";
import {
  ensureProductIndexes,
  findProductBySkuInWorkspace,
  findProductInWorkspace,
  insertProduct,
  listProductsInWorkspace,
  toProductDTO,
  updateProductInWorkspace,
} from "@/server/products/repository";
import type { ProductDTO, ProductListResult } from "@/server/products/types";
import type { SessionContext } from "@/server/auth/types";

function assertPermission(
  session: SessionContext,
  permission: SessionContext["membership"]["permissions"][number],
) {
  if (!session.membership.permissions.includes(permission)) {
    throw new AppError({
      code: "FORBIDDEN",
      message: `Missing permission: ${permission}`,
      userMessage: session.user.isDemo
        ? "Demo accounts are read-only. Product changes are disabled."
        : "You do not have permission to perform this action.",
    });
  }
}

export async function listProductsForSession(
  session: SessionContext,
  rawQuery: unknown,
): Promise<ProductListResult> {
  assertPermission(session, "products.read");
  await ensureProductIndexes();

  const parsed = parseWithSchema(productListQuerySchema, rawQuery);
  if (!parsed.ok) {
    throw parsed.error;
  }

  const { q, page, pageSize } = parsed.data;
  const { items, total } = await listProductsInWorkspace({
    workspaceId: session.workspace.id,
    q,
    page,
    pageSize,
  });

  const pageCount = total === 0 ? 0 : Math.ceil(total / pageSize);

  return {
    items: items.map(toProductDTO),
    total,
    page,
    pageSize,
    pageCount,
  };
}

export async function getProductForSession(
  session: SessionContext,
  productId: string,
): Promise<ProductDTO> {
  assertPermission(session, "products.read");
  await ensureProductIndexes();

  const doc = await findProductInWorkspace({
    workspaceId: session.workspace.id,
    productId,
  });

  if (!doc) {
    throw new AppError({
      code: "NOT_FOUND",
      message: "Product not found in workspace",
      userMessage: "Product not found.",
    });
  }

  return toProductDTO(doc);
}

export async function createProductForSession(
  session: SessionContext,
  rawInput: unknown,
): Promise<ProductDTO> {
  assertPermission(session, "products.create");
  await ensureProductIndexes();

  const parsed = parseWithSchema(productInputSchema, rawInput);
  if (!parsed.ok) {
    throw parsed.error;
  }

  const input = parsed.data;
  const existing = await findProductBySkuInWorkspace({
    workspaceId: session.workspace.id,
    sku: input.sku,
  });

  if (existing) {
    throw new AppError({
      code: "CONFLICT",
      message: "Product SKU already exists in workspace",
      userMessage: "A product with this SKU already exists in your workspace.",
    });
  }

  try {
    const created = await insertProduct({
      workspaceId: session.workspace.id,
      createdByUserId: session.user.id,
      ...input,
    });
    return toProductDTO(created);
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: number }).code === 11000
    ) {
      throw new AppError({
        code: "CONFLICT",
        message: "Product SKU unique index conflict",
        userMessage: "A product with this SKU already exists in your workspace.",
      });
    }
    throw error;
  }
}

export async function updateProductForSession(
  session: SessionContext,
  productId: string,
  rawInput: unknown,
): Promise<ProductDTO> {
  assertPermission(session, "products.update");
  await ensureProductIndexes();

  const parsed = parseWithSchema(productInputSchema, rawInput);
  if (!parsed.ok) {
    throw parsed.error;
  }

  const input: ProductInput = parsed.data;

  const existing = await findProductInWorkspace({
    workspaceId: session.workspace.id,
    productId,
  });

  if (!existing) {
    throw new AppError({
      code: "NOT_FOUND",
      message: "Product not found in workspace",
      userMessage: "Product not found.",
    });
  }

  const skuConflict = await findProductBySkuInWorkspace({
    workspaceId: session.workspace.id,
    sku: input.sku,
    excludeProductId: productId,
  });

  if (skuConflict) {
    throw new AppError({
      code: "CONFLICT",
      message: "Product SKU already exists in workspace",
      userMessage: "A product with this SKU already exists in your workspace.",
    });
  }

  try {
    const updated = await updateProductInWorkspace({
      workspaceId: session.workspace.id,
      productId,
      patch: input,
    });

    if (!updated) {
      throw new AppError({
        code: "NOT_FOUND",
        message: "Product not found during update",
        userMessage: "Product not found.",
      });
    }

    return toProductDTO(updated);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: number }).code === 11000
    ) {
      throw new AppError({
        code: "CONFLICT",
        message: "Product SKU unique index conflict",
        userMessage: "A product with this SKU already exists in your workspace.",
      });
    }
    throw error;
  }
}
