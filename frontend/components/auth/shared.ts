/**
 * The auth field treatment. This is the shared `.input` component class from
 * globals.css — it must not re-declare colours, or the auth screens drift out
 * of the token system the way they did before (hardcoded hex, dark focus ring,
 * no accent).
 */
export const authInput = "input";

/** Only accept same-site relative paths — a caller-supplied ?next= is an open-redirect otherwise. */
export const safeNext = (next: string | null) =>
  next && next.startsWith("/") && !next.startsWith("//") ? next : null;
