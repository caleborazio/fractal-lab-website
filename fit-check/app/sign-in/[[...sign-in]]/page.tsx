import { SignIn } from "@clerk/nextjs";
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
        <span className="font-mono text-xs uppercase tracking-wider text-pine">Mind the Fit</span>
      </header>
      <div className="flex flex-1 items-center justify-center">
        {clerkEnabled ? (
          <SignIn
            forceRedirectUrl={back}
            signUpUrl={`/sign-up?redirect_url=${encodeURIComponent(back)}`}
            appearance={{
              variables: {
                colorPrimary: "#8a6112",
                borderRadius: "0.5rem",
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
