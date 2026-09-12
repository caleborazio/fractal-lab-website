import { SignUp } from "@clerk/nextjs";
import { clerkEnabled, safeReturnPath } from "@/lib/auth";

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect_url?: string }>;
}) {
  const { redirect_url } = await searchParams;
  const back = safeReturnPath(redirect_url);

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col px-5 py-8">
      <header className="mb-8 flex items-center justify-between">
        <a
          href="https://fractallab.co"
          className="font-mono text-xs uppercase tracking-wider text-ink-faint hover:text-accent"
        >
          Fractal Lab
        </a>
        <span className="font-mono text-xs uppercase tracking-wider text-pine">
          Mind the Fit · beta
        </span>
      </header>
      <div className="flex flex-1 items-center justify-center">
        {clerkEnabled ? (
          <SignUp
            forceRedirectUrl={back}
            signInUrl={back ? `/sign-in?redirect_url=${encodeURIComponent(back)}` : "/sign-in"}
            appearance={{
              variables: {
                colorPrimary: "#8a6112",
                borderRadius: "0.5rem",
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
