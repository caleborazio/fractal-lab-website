// Per-person share links: mindthefit.com/get?ref=handle (any page works).
// The first such link someone opens is remembered in a cookie and saved on
// their profile when they first save measurements, so sign-ups can be
// counted by who sent them.
export const REF_COOKIE = "mtf_ref";
export const REF_COOKIE_MAX_AGE = 90 * 24 * 60 * 60;

/** Handles only -- lowercase letters, numbers, dot, dash, underscore. */
export function cleanRef(value: string | null | undefined): string | null {
  const ref = value?.trim().toLowerCase().replace(/^@/, "");
  return ref && /^[a-z0-9._-]{1,40}$/.test(ref) ? ref : null;
}
