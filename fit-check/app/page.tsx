import Link from "next/link";
import { PLUS_PRICE_LABEL, FREE_CHECKS_PER_MONTH } from "@/lib/plan";

const STEPS = [
  {
    n: "01",
    title: "Set up your measurements",
    body: "Bust, waist, hip — and optionally height. Takes a minute, stays private, and it's what every check gets compared against.",
  },
  {
    n: "02",
    title: "Paste a listing or upload photos",
    body: "Drop in a link from Depop, Poshmark, eBay, Vinted, or wherever — or upload a photo of the tag, a measurements card, or a flat-lay.",
  },
  {
    n: "03",
    title: "Get an honest read",
    body: "Tight, fitted, comfortable, or loose — per dimension, in plain language, plus a guess at where a hem would actually land on you.",
  },
];

const FAQS = [
  {
    q: "How is this different from a size chart?",
    a: "Size labels aren't consistent across brands, decades, or sellers — a vintage “M” can mean almost anything. Mind the Fit reads the actual stated measurements for that specific item and compares them to your real body, not a label.",
  },
  {
    q: "What if the listing doesn't have measurements?",
    a: "You'll get an honest “not enough information” rather than a guess. Photos of a measuring-tape shot or the seller's description often have more than the size line does.",
  },
  {
    q: "Do you store my measurements?",
    a: "They're saved to your account so you don't have to re-enter them, and they're never shared or shown to anyone else.",
  },
  {
    q: "Which sites work with a pasted link?",
    a: "Most resale marketplaces work directly. A few (notably sites that block automated access) don't support links yet — for those, upload a screenshot or photo instead and it works the same way.",
  },
];

export default function LandingPage() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-8">
      <header className="mb-16 flex items-center justify-between">
        <a
          href="https://fractallab.co"
          className="font-mono text-xs uppercase tracking-wider text-ink-faint hover:text-accent"
        >
          Fractal Lab
        </a>
        <div className="flex items-center gap-4">
          <span className="font-mono text-xs uppercase tracking-wider text-pine">
            Mind the Fit · beta
          </span>
          <Link
            href="/sign-in"
            className="font-mono text-xs uppercase tracking-wider text-ink-faint hover:text-accent"
          >
            Sign in
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="mb-20">
        <h1 className="mb-4 max-w-xl text-4xl font-semibold sm:text-5xl">
          Know if it&apos;ll fit — before you buy it.
        </h1>
        <p className="mb-8 max-w-lg text-lg text-ink-soft">
          Paste a secondhand or vintage listing and Mind the Fit reads the seller&apos;s actual
          measurements, then tells you honestly whether it&apos;ll fit your body. No size-label
          guessing.
        </p>
        <div className="flex flex-wrap items-center gap-4">
          <Link
            href="/sign-up"
            className="rounded bg-accent px-6 py-3 font-medium text-bg hover:bg-accent-strong"
          >
            Try it free
          </Link>
          <a href="#how-it-works" className="text-sm text-ink-soft underline hover:text-accent">
            See how it works
          </a>
        </div>
      </section>

      {/* Why */}
      <section className="mb-20 rounded-lg border border-line bg-panel px-6 py-6">
        <p className="max-w-2xl text-ink-soft">
          A vintage &quot;M&quot; and a fast-fashion &quot;M&quot; aren&apos;t the same dress. Secondhand and
          vintage sizing has never been standardized, and most fit-prediction tools are built for
          new inventory with consistent size charts — not a one-off listing from a stranger&apos;s
          closet. Mind the Fit skips the label entirely and compares the garment&apos;s real
          measurements to your real body.
        </p>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="mb-20 scroll-mt-8">
        <h2 className="mb-8 text-2xl font-semibold">How it works</h2>
        <div className="flex flex-col gap-6">
          {STEPS.map((step) => (
            <div key={step.n} className="flex gap-5">
              <span className="font-mono text-sm text-accent">{step.n}</span>
              <div>
                <h3 className="mb-1 text-lg font-semibold">{step.title}</h3>
                <p className="max-w-md text-ink-soft">{step.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="mb-20 scroll-mt-8">
        <h2 className="mb-8 text-2xl font-semibold">Pricing</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-line bg-panel p-6">
            <p className="mb-1 font-mono text-xs uppercase tracking-wide text-ink-faint">Free</p>
            <p className="mb-4 text-3xl font-semibold">$0</p>
            <p className="mb-6 text-sm text-ink-soft">
              {FREE_CHECKS_PER_MONTH} fit checks every month. Full accuracy, no card required.
            </p>
            <Link
              href="/sign-up"
              className="inline-block rounded border border-line-strong px-4 py-2 text-sm font-medium hover:border-accent hover:text-accent"
            >
              Get started free
            </Link>
          </div>
          <div className="rounded-lg border border-accent bg-panel p-6">
            <p className="mb-1 font-mono text-xs uppercase tracking-wide text-accent">Plus</p>
            <p className="mb-4 text-3xl font-semibold">
              {PLUS_PRICE_LABEL}
              <span className="text-base font-normal text-ink-faint">/mo</span>
            </p>
            <p className="mb-6 text-sm text-ink-soft">
              Unlimited fit checks. For anyone shopping secondhand regularly.
            </p>
            <Link
              href="/sign-up"
              className="inline-block rounded bg-accent px-4 py-2 text-sm font-medium text-bg hover:bg-accent-strong"
            >
              Try it free
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="mb-20">
        <h2 className="mb-8 text-2xl font-semibold">Questions</h2>
        <div className="flex flex-col gap-4">
          {FAQS.map((item) => (
            <details key={item.q} className="rounded-lg border border-line bg-panel">
              <summary className="cursor-pointer px-5 py-4 text-sm font-medium text-ink hover:text-accent">
                {item.q}
              </summary>
              <p className="border-t border-line px-5 py-4 text-sm text-ink-soft">{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="mb-16 rounded-lg border border-line bg-panel px-6 py-10 text-center">
        <h2 className="mb-3 text-2xl font-semibold">Stop guessing. Start checking.</h2>
        <p className="mx-auto mb-6 max-w-md text-ink-soft">
          Set up your measurements once, then check as many listings as you want.
        </p>
        <Link
          href="/sign-up"
          className="inline-block rounded bg-accent px-6 py-3 font-medium text-bg hover:bg-accent-strong"
        >
          Try it free
        </Link>
      </section>

      <footer className="border-t border-line py-6 text-center">
        <a
          href="https://fractallab.co"
          className="font-mono text-xs uppercase tracking-wider text-ink-faint hover:text-accent"
        >
          A Fractal Lab product
        </a>
      </footer>
    </main>
  );
}
