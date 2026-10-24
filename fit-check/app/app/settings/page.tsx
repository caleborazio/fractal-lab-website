import Link from "next/link";
import { redirect } from "next/navigation";
import { getUserId, getUserEmail } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AppHeader } from "@/components/AppHeader";
import { AccountActions } from "@/components/AccountActions";
import { MeasurementsForm } from "@/components/MeasurementsForm";
import { ConnectionsManager } from "@/components/ConnectionsManager";
import { FREE_CHECKS_PER_MONTH } from "@/lib/plan";

export default async function SettingsPage() {
  const userId = await getUserId();
  if (!userId) redirect(`/sign-in?redirect_url=${encodeURIComponent("/app/settings")}`);

  const [email, profile] = await Promise.all([
    getUserEmail(),
    prisma.profile.findUnique({ where: { id: userId } }),
  ]);
  const plan = profile?.plan ?? "free";

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col px-5 py-8">
      <AppHeader />

      <h1 className="mb-8 text-4xl">Settings</h1>

      <section className="mb-8 flex items-center justify-between border border-line bg-bg px-5 py-4">
        <div>
          {email && <p className="text-sm text-ink">{email}</p>}
          <p className="text-xs text-ink-faint">
            {plan === "paid"
              ? "Mind the Fit Plus — unlimited checks"
              : `Free plan — ${FREE_CHECKS_PER_MONTH} checks/month`}
          </p>
        </div>
        <AccountActions plan={plan} />
      </section>

      <h2 className="mb-3 text-2xl">Your measurements</h2>
      <p className="mb-4 max-w-prose text-sm text-ink-soft">
        Private, never shared — this is what every fit-check gets compared against.
      </p>
      <MeasurementsForm />

      <h2 className="mb-3 mt-12 text-2xl">Use it everywhere</h2>
      <p className="mb-4 max-w-prose text-sm text-ink-soft">
        Add Mind the Fit to Chrome, Safari or your iPhone to check listings right where you shop.
      </p>
      <Link
        href="/get"
        className="self-start border border-line-strong px-4 py-2 text-sm hover:border-ink"
      >
        Get the extension and app →
      </Link>

      <h2 className="mb-3 mt-12 text-2xl">Connections</h2>
      <ConnectionsManager />

      <Link
        href="/"
        className="mt-10 text-sm text-ink-faint underline hover:text-accent"
      >
        ← Back to mindthefit.com
      </Link>
    </main>
  );
}
