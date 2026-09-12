import { SignIn } from "@clerk/nextjs";
import { safeReturnPath } from "@/lib/auth";

export default async function SignInPage({
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
        <SignIn
          forceRedirectUrl={back}
          signUpUrl={back ? `/sign-up?redirect_url=${encodeURIComponent(back)}` : "/sign-up"}
          appearance={{
            variables: {
              colorPrimary: "#8a6112",
              borderRadius: "0.5rem",
            },
          }}
        />
      </div>
    </main>
  );
}
