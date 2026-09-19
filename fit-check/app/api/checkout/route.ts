import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId, getUserEmail } from "@/lib/auth";
import { getStripe, stripeEnabled } from "@/lib/stripe";

export async function POST() {
  if (!stripeEnabled || !process.env.STRIPE_PRICE_ID) {
    return NextResponse.json({ error: "Billing isn't configured yet." }, { status: 501 });
  }

  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }

  const profile = await prisma.profile.findUnique({ where: { id: userId } });
  const stripe = await getStripe();
  const origin = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.mindthefit.com";

  // A returning Stripe customer already has their email on file there, so
  // pass `customer` for them; a first-time purchaser has no Stripe record
  // yet, so prefill from Clerk instead -- either way, nobody retypes an
  // email we already know. Stripe rejects `customer` and `customer_email`
  // together, so this is deliberately one or the other, never both.
  const email = profile?.stripeCustomerId ? null : await getUserEmail();

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
    // Lets a shopper type a code (e.g. a free beta promo code) into
    // Stripe's own hosted checkout -- no custom UI needed for this.
    allow_promotion_codes: true,
    // A 100%-off code means nothing is due today; don't make someone enter a
    // card for a $0 charge just because subscriptions normally require one.
    payment_method_collection: "if_required",
    customer: profile?.stripeCustomerId ?? undefined,
    customer_email: email ?? undefined,
    client_reference_id: userId,
    branding_settings: { display_name: "Mind the Fit" },
    success_url: `${origin}/app`,
    cancel_url: `${origin}/app`,
  });

  return NextResponse.json({ url: session.url });
}
