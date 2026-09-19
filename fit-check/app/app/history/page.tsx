import { redirect } from "next/navigation";
import { getUserId } from "@/lib/auth";
import { AppHeader } from "@/components/AppHeader";
import { CheckHistory } from "@/components/CheckHistory";

export default async function HistoryPage() {
  const userId = await getUserId();
  if (!userId) redirect(`/sign-in?redirect_url=${encodeURIComponent("/app/history")}`);

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col px-5 py-8">
      <AppHeader />
      <h1 className="mb-4 text-2xl font-semibold">Your checks</h1>
      <CheckHistory />
    </main>
  );
}
