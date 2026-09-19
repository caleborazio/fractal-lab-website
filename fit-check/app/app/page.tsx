import { redirect } from "next/navigation";
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { getUserId, clerkEnabled } from "@/lib/auth";
import { FitCheckApp } from "@/components/FitCheckApp";

// Server component so the sign-in gate runs before anything renders, and so
// UserButton can be used at all -- this Clerk version leaks server-only code
// into the client bundle if its components are imported from a "use client"
// file under Next 16 (see components/FitCheckApp.tsx, which deliberately
// doesn't import anything from @clerk/nextjs).
export default async function AppPage() {
  const userId = await getUserId();
  if (!userId) redirect(`/sign-in?redirect_url=${encodeURIComponent("/app")}`);

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col px-5 py-8">
      <header className="mb-8 flex items-center justify-between">
        <Link href="/app" className="font-mono text-xs uppercase tracking-wider text-pine">
          Mind the Fit
        </Link>
        <div className="flex items-center gap-4">
          <Link
            href="/app/history"
            className="font-mono text-xs uppercase tracking-wider text-ink-faint hover:text-accent"
          >
            History
          </Link>
          {clerkEnabled && <UserButton />}
        </div>
      </header>
      <FitCheckApp />
    </main>
  );
}
