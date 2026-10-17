import Link from "next/link";
import { SignUp } from "@clerk/nextjs";
import { Mark, Wordmark } from "@/components/Brand";
import { clerkEnabled, safeReturnPath } from "@/lib/auth";

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect_url?: string }>;
}) {
  const { redirect_url } = await searchParams;
  // Landing on /sign-up with no return path (e.g. clicked "Try it free" on
  // the marketing page) should land in the app after signing up.
  const back = safeReturnPath(redirect_url) ?? "/app";

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col px-5 py-8">
      <header className="mb-8">
        <Link href="/" aria-label="Mind the Fit home" className="flex items-center gap-2.5">
          <Mark size={28} />
          <Wordmark className="text-[22px]" />
        </Link>
      </header>
      <div className="flex flex-1 items-center justify-center">
        {clerkEnabled ? (
          <SignUp
            forceRedirectUrl={back}
            signInUrl={`/sign-in?redirect_url=${encodeURIComponent(back)}`}
            appearance={{
              variables: {
                colorPrimary: "#1c1b19",
                colorBackground: "#fbf8f2",
                fontFamily: "'EB Garamond', Georgia, serif",
                borderRadius: "0.125rem",
              },
            }}
          />
        ) : (
          <p className="text-ink-soft">Sign-up isn&apos;t configured yet.</p>
        )}
      </div>
    </main>
  );
}
