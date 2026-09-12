import { redirect } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { getUserId, clerkEnabled } from "@/lib/auth";
import { FitCheckApp } from "@/components/FitCheckApp";

// Server component so the sign-in gate runs before anything renders, and so
// UserButton can be used at all -- this Clerk version leaks server-only code
// into the client bundle if its components are imported from a "use client"
// file under Next 16 (see components/FitCheckApp.tsx, which deliberately
// doesn't import anything from @clerk/nextjs).
export default async function Page() {
  const userId = await getUserId();
  if (!userId) redirect("/sign-in");

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col px-5 py-8">
      <header className="mb-8 flex items-center justify-between">
        <a
          href="https://fractallab.co"
          className="font-mono text-xs uppercase tracking-wider text-ink-faint hover:text-accent"
        >
          Fractal Lab
        </a>
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs uppercase tracking-wider text-pine">
            Mind the Fit · beta
          </span>
          {clerkEnabled && <UserButton />}
        </div>
      </header>
      <FitCheckApp />
    </main>
  );
}
