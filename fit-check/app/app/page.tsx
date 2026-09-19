import { redirect } from "next/navigation";
import { getUserId } from "@/lib/auth";
import { AppHeader } from "@/components/AppHeader";
import { FitCheckApp } from "@/components/FitCheckApp";

// Server component so the sign-in gate runs before anything renders, and so
// AppHeader's UserButton can be used at all -- this Clerk version leaks
// server-only code into the client bundle if its components are imported
// from a "use client" file under Next 16 (see components/FitCheckApp.tsx,
// which deliberately doesn't import anything from @clerk/nextjs).
export default async function AppPage() {
  const userId = await getUserId();
  if (!userId) redirect(`/sign-in?redirect_url=${encodeURIComponent("/app")}`);

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col px-5 py-8">
      <AppHeader />
      <FitCheckApp />
    </main>
  );
}
