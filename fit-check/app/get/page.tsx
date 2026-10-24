import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { Mark, Wordmark } from "@/components/Brand";
import { STORE_LINKS, installTargetFor, type InstallTarget } from "@/lib/install";

export const metadata: Metadata = {
  title: "Get Mind the Fit",
  description: "Add Mind the Fit to Chrome, Safari or your iPhone and check a listing's fit from wherever you shop.",
};

const primaryButton =
  "inline-block bg-ink px-7 py-4 text-center font-mono text-sm font-semibold uppercase tracking-wider text-bg hover:bg-ink-soft";

const SECTIONS: Record<
  InstallTarget,
  { title: string; blurb: string; button: string; then: string[]; fromSource: string[] }
> = {
  chrome: {
    title: "Chrome",
    blurb: "Also Edge, Brave and Arc. Click the Mind the Fit icon on any listing to check it.",
    button: "Add to Chrome",
    then: ["Click the Mind the Fit icon in the toolbar and choose Sign in — it connects to your account on its own."],
    fromSource: [
      "Open chrome://extensions and turn on Developer mode.",
      "Click Load unpacked and pick the fit-check-extension folder.",
    ],
  },
  macSafari: {
    title: "Safari on Mac",
    blurb: "Click the Mind the Fit icon on any listing to check it.",
    button: "Get it on the Mac App Store",
    then: [
      "Open the Mind the Fit app once, then turn it on in Safari → Settings → Extensions.",
      "Click its icon and choose Sign in — it connects to your account on its own. The first time, choose Always Allow on This Website.",
    ],
    fromSource: [
      "Open Mac/Mind the Fit/Mind the Fit.xcodeproj in Xcode and run it once (⌘R).",
      "In Safari → Settings → Advanced, turn on Show features for web developers, then Developer → Allow unsigned extensions.",
    ],
  },
  iphone: {
    title: "iPhone",
    blurb: "Check a listing from the share button in any shopping app, or from Safari.",
    button: "Get it on the App Store",
    then: [
      "Sign in once in the app — the share button and Safari use the same sign-in.",
      "In the app's Account tab, tap Put it first in your share sheet.",
    ],
    fromSource: ["Build the MindTheFit project in Xcode to your iPhone."],
  },
};

const ORDER: InstallTarget[] = ["chrome", "macSafari", "iphone"];

// Public on purpose: it's the link the iPhone app sends to your computer, and
// where install buttons live once each store listing is up.
export default async function GetPage() {
  const detected = installTargetFor((await headers()).get("user-agent") ?? "");
  const order = detected ? [detected, ...ORDER.filter((t) => t !== detected)] : ORDER;

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col px-5 py-8">
      <header className="mb-10 border-b border-line pb-4">
        <Link href="/" aria-label="Mind the Fit home" className="flex items-center gap-2.5">
          <Mark size={28} />
          <Wordmark className="text-[22px]" />
        </Link>
      </header>

      <h1 className="mb-3 text-4xl">Get Mind the Fit</h1>
      <p className="mb-10 max-w-prose text-sm text-ink-soft">
        Check a listing&apos;s fit from wherever you shop. Sign in once on each — they all use the
        same account, measurements and history.
      </p>

      <div className="flex flex-col gap-6">
        {order.map((target) => {
          const section = SECTIONS[target];
          const storeLink = STORE_LINKS[target];
          return (
            <section key={target} id={target} className="border border-line bg-bg px-5 py-5">
              {target === detected && (
                <p className="mb-2 font-mono text-xs uppercase tracking-wide text-ink-faint">
                  {target === "iphone" ? "For this phone" : "For this browser"}
                </p>
              )}
              <h2 className="mb-1 text-2xl">{section.title}</h2>
              <p className="mb-4 text-sm text-ink-soft">{section.blurb}</p>

              {storeLink ? (
                <a href={storeLink} className={primaryButton}>
                  {section.button}
                </a>
              ) : (
                <p className="font-mono text-xs font-semibold uppercase tracking-wide text-ink-faint">
                  Coming soon to the store
                </p>
              )}

              <ol className="mt-4 flex list-decimal flex-col gap-1.5 pl-5 text-sm text-ink-soft">
                {section.then.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>

              {!storeLink && (
                <details className="mt-4 text-sm text-ink-faint">
                  <summary className="cursor-pointer hover:text-ink">Setting it up from the source</summary>
                  <ol className="mt-2 flex list-decimal flex-col gap-1.5 pl-5">
                    {section.fromSource.map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ol>
                </details>
              )}
            </section>
          );
        })}
      </div>

      <Link href="/" className="mt-10 text-sm text-ink-faint underline hover:text-accent">
        ← Back to mindthefit.com
      </Link>
    </main>
  );
}
