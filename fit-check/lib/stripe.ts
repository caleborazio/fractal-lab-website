import type Stripe from "stripe";

/**
 * Billing abstraction: mirrors lib/auth.ts's shape. Without a key, billing
 * routes explain they're not configured yet instead of erroring -- same
 * "works with nothing configured" philosophy as the rest of this app.
 */
export const stripeEnabled = !!process.env.STRIPE_SECRET_KEY;

export async function getStripe() {
  const { default: Stripe } = await import("stripe");
  // Pinned explicitly: the installed SDK's own default (checked directly
  // against this account) is a newer API generation that renamed at least
  // one param this app relies on (promotion_codes' `coupon` field, hit while
  // setting up the beta codes). 2024-06-20 is a known-stable version that
  // still has everything this app uses -- cast because the SDK's types only
  // know about its own bundled (newer) version string, not this one.
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2024-06-20" as Stripe.LatestApiVersion,
  });
}
