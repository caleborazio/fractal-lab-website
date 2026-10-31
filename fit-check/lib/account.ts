import { prisma } from "@/lib/prisma";
import { clerkEnabled, DEV_USER_ID } from "@/lib/auth";
import { getStripe, stripeEnabled } from "@/lib/stripe";

/**
 * Deletes an account outright: any running subscription, then history,
 * connections and measurements, then the sign-in itself. The App Store
 * requires apps that create accounts to offer this; the website's Settings
 * and the iPhone app's Account tab both call it.
 */
export async function deleteAccount(userId: string): Promise<void> {
  const profile = await prisma.profile.findUnique({
    where: { id: userId },
    select: { stripeSubscriptionId: true },
  });

  // Cancel first: deleting the profile would lose the only link to a
  // subscription that would otherwise keep charging.
  if (profile?.stripeSubscriptionId && stripeEnabled) {
    const stripe = await getStripe();
    const subscription = await stripe.subscriptions
      .retrieve(profile.stripeSubscriptionId)
      .catch((err: { code?: string }) => (err.code === "resource_missing" ? null : Promise.reject(err)));
    if (subscription && subscription.status !== "canceled") {
      await stripe.subscriptions.cancel(subscription.id);
    }
  }

  // Checks don't cascade from the profile; connections do.
  await prisma.$transaction([
    prisma.fitCheck.deleteMany({ where: { profileId: userId } }),
    prisma.profile.deleteMany({ where: { id: userId } }),
  ]);

  if (clerkEnabled && userId !== DEV_USER_ID) {
    const { clerkClient } = await import("@clerk/nextjs/server");
    const client = await clerkClient();
    await client.users.deleteUser(userId);
  }
}
