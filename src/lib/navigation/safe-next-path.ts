/**
 * Restrict post-auth redirects to same-origin relative paths.
 * Blocks protocol-relative (`//…`) and absolute URLs.
 */
export function getSafeNextPath(
  value: string | null | undefined,
  fallback = "/",
): string {
  if (!value) {
    return fallback;
  }

  const trimmed = value.trim();

  if (!trimmed.startsWith("/")) {
    return fallback;
  }

  if (trimmed.startsWith("//") || trimmed.includes("\\") || trimmed.includes("://")) {
    return fallback;
  }

  return trimmed;
}
