import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Mark, Wordmark } from "@/components/Brand";
import { getUserEmail, getUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ConnectHandoff, type ConnectTarget } from "@/components/ConnectHandoff";

const TARGETS: readonly ConnectTarget[] = ["app", "extension"];

// Where the iPhone app and browser extension send people to sign in. After
// sign-in (and measurements, for a brand-new account) one tap creates a
// connection code and hands it straight back -- nothing to copy or paste.
export default async function ConnectPage({ params }: { params: Promise<{ target: string }> }) {
  const { target } = await params;
  if (!TARGETS.includes(target as ConnectTarget)) notFound();

  const userId = await getUserId();
  if (!userId) redirect(`/sign-in?redirect_url=${encodeURIComponent(`/connect/${target}`)}`);

  const [email, profile] = await Promise.all([
    getUserEmail(),
    prisma.profile.findUnique({ where: { id: userId }, select: { id: true } }),
  ]);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col px-5 py-8">
      <header className="mb-10">
        <Link href="/" aria-label="Mind the Fit home" className="flex items-center gap-2.5">
          <Mark size={28} />
          <Wordmark className="text-[22px]" />
        </Link>
      </header>
      <ConnectHandoff target={target as ConnectTarget} email={email} hasProfile={!!profile} />
    </main>
  );
}
