import { redirect } from "next/navigation";
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { getUserId, getUserEmail, clerkEnabled } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CheckHistory } from "@/components/CheckHistory";
import { AccountActions } from "@/components/AccountActions";
import { FREE_CHECKS_PER_MONTH } from "@/lib/plan";

export default async function HistoryPage() {
  const userId = await getUserId();
  if (!userId) redirect(`/sign-in?redirect_url=${encodeURIComponent("/app/history")}`);

  const [email, profile] = await Promise.all([
    getUserEmail(),
    prisma.profile.findUnique({ where: { id: userId } }),
  ]);
  const plan = profile?.plan ?? "free";

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col px-5 py-8">
      <header className="mb-8 flex items-center justify-between">
        <Link href="/app" className="font-mono text-xs uppercase tracking-wider text-pine">
          Mind the Fit
        </Link>
        <div className="flex items-center gap-4">
          <Link
            href="/app"
            className="font-mono text-xs uppercase tracking-wider text-ink-faint hover:text-accent"
          >
            New check
          </Link>
          {clerkEnabled && <UserButton />}
        </div>
      </header>

      <section className="mb-8 flex items-center justify-between rounded-lg border border-line bg-panel px-5 py-4">
        <div>
          {email && <p className="text-sm text-ink">{email}</p>}
          <p className="text-xs text-ink-faint">
            {plan === "paid" ? "Mind the Fit Plus — unlimited checks" : `Free plan — ${FREE_CHECKS_PER_MONTH} checks/month`}
          </p>
        </div>
        <AccountActions plan={plan} />
      </section>

      <h1 className="mb-4 text-2xl font-semibold">Your checks</h1>
      <CheckHistory />
    </main>
  );
}
