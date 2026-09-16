import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/auth";
import { getStripe, stripeEnabled } from "@/lib/stripe";

export async function POST() {
  if (!stripeEnabled) {
    return NextResponse.json({ error: "Billing isn't configured yet." }, { status: 501 });
  }

  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }

  const profile = await prisma.profile.findUnique({ where: { id: userId } });
  if (!profile?.stripeCustomerId) {
    return NextResponse.json({ error: "No billing account found." }, { status: 404 });
  }

  const stripe = await getStripe();
  const origin = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.mindthefit.com";

  const session = await stripe.billingPortal.sessions.create({
    customer: profile.stripeCustomerId,
    return_url: origin,
  });

  return NextResponse.json({ url: session.url });
}
