import Link from "next/link";
import { SignIn } from "@clerk/nextjs";
import { Mark, Wordmark } from "@/components/Brand";
import { clerkEnabled, safeReturnPath } from "@/lib/auth";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect_url?: string }>;
}) {
  const { redirect_url } = await searchParams;
  // Landing on /sign-in with no return path (e.g. clicked "Sign in" on the
  // marketing page) should still land in the app, not back on the page that
  // has no reason to require a session.
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
          <SignIn
            forceRedirectUrl={back}
            signUpUrl={`/sign-up?redirect_url=${encodeURIComponent(back)}`}
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
          // <SignIn> needs a mounted <ClerkProvider>, which layout.tsx only
          // renders when Clerk is configured -- without keys, every visitor
          // is already "dev-user" and never gets routed here, but the route
          // still exists, so it should say why rather than throw.
          <p className="text-ink-soft">Sign-in isn&apos;t configured yet.</p>
        )}
      </div>
    </main>
  );
}
