import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStripe, stripeEnabled } from "@/lib/stripe";

export const dynamic = "force-dynamic";

/**
 * Stripe webhook: flips Profile.plan on subscription lifecycle events.
 * Signature-verified with STRIPE_WEBHOOK_SECRET, mirroring CommishHQ's
 * webhook -- but this one tracks a subscription's whole life, not just its
 * creation, since a subscription can lapse or get canceled independently of
 * the checkout that started it.
 */
export async function POST(req: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripeEnabled || !webhookSecret) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 501 });
  }

  const stripe = await getStripe();
  const signature = req.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  let event;
  try {
    event = stripe.webhooks.constructEvent(await req.text(), signature, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      const userId = session.client_reference_id;
      if (userId) {
        await prisma.profile.update({
          where: { id: userId },
          data: {
            plan: "paid",
            stripeCustomerId:
              typeof session.customer === "string" ? session.customer : undefined,
            stripeSubscriptionId:
              typeof session.subscription === "string" ? session.subscription : undefined,
          },
        });
      }
      break;
    }

    // Covers cancellation and lapsed renewal (past_due/unpaid) in one place
    // -- either way, unlimited access should stop; active/trialing keep it.
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const subscription = event.data.object;
      const stillPaid =
        event.type === "customer.subscription.updated" &&
        ["active", "trialing"].includes(subscription.status);
      await prisma.profile.updateMany({
        where: { stripeSubscriptionId: subscription.id },
        data: { plan: stillPaid ? "paid" : "free" },
      });
      break;
    }
  }

  return NextResponse.json({ received: true });
}
