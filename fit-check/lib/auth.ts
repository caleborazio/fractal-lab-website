/**
 * Auth abstraction: when Clerk keys are present, identity comes from Clerk;
 * without keys (local dev) every visitor is "dev-user" so the whole product
 * runs end-to-end with no accounts configured. Mirrors CommishHQ's lib/auth.ts.
 */

export const clerkEnabled = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

export const DEV_USER_ID = "dev-user";

export async function getUserId(): Promise<string | null> {
  if (!clerkEnabled) return DEV_USER_ID;
  const { auth } = await import("@clerk/nextjs/server");
  const { userId } = await auth();
  return userId;
}

/** For prefilling forms (e.g. Stripe Checkout) so people aren't asked to
 * retype something we already know from their signed-in session. */
export async function getUserEmail(): Promise<string | null> {
  if (!clerkEnabled) return null;
  const { currentUser } = await import("@clerk/nextjs/server");
  const user = await currentUser();
  return user?.primaryEmailAddress?.emailAddress ?? null;
}

/**
 * Sanitize a post-auth return path. Only same-origin relative routes are
 * allowed, so a crafted `?redirect_url=https://evil.example` can never turn a
 * sign-in link into an open redirect.
 */
export function safeReturnPath(value: string | undefined | null): string | undefined {
  if (!value) return undefined;
  if (!value.startsWith("/")) return undefined; // absolute/external
  if (value.startsWith("//") || value.startsWith("/\\")) return undefined; // protocol-relative
  return value;
}
