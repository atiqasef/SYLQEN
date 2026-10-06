/**
 * Shared domain types that are safe for both client and server imports.
 * Server-only identity/session types live under `src/server/auth`.
 */

export type Brand<T, TBrand extends string> = T & {
  readonly __brand: TBrand;
};

export type ISODateString = Brand<string, "ISODateString">;

export type FeatureStatus = "foundation" | "planned" | "active";
