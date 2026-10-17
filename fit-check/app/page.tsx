import Link from "next/link";
import { PLUS_PRICE_LABEL, FREE_CHECKS_PER_MONTH } from "@/lib/plan";
import { Mark, Wordmark } from "@/components/Brand";

const STEPS = [
  {
    n: "01",
    title: "Set up your measurements",
    body: "Bust, waist, hip — and optionally height and inseam. Takes a minute, stays private, and it’s what every check gets compared against.",
  },
  {
    n: "02",
    title: "Share the listing",
    body: "Paste a link from Poshmark or Vinted and it reads the listing directly. From anywhere else — Depop, eBay, an Instagram post, a vintage seller’s own site — upload a photo of the tag, a measurements card, or a flat-lay instead.",
  },
  {
    n: "03",
    title: "Get an honest read",
    body: "Tight, fitted, comfortable, or loose — per measurement, inch by inch, plus where the hem will actually land on you.",
  },
];

const FAQS = [
  {
    q: "How is this different from a size chart?",
    a: "Size labels aren’t consistent across brands, decades, or sellers — a vintage “M” can mean almost anything. Mind the Fit reads the actual stated measurements for that specific item and compares them to your real body, not a label.",
  },
  {
    q: "What if the listing doesn’t have measurements?",
    a: "You’ll get an honest “not enough information” rather than a guess. Photos of a measuring-tape shot or the seller’s description often have more than the size line does.",
  },
  {
    q: "Do you store my measurements?",
    a: "They’re saved to your account so you don’t have to re-enter them, and they’re never shared or shown to anyone else.",
  },
  {
    q: "Which sites work with a pasted link?",
    a: "Poshmark and Vinted work directly today. Many others — including Depop, eBay, and Instagram — actively block automated reading, so a pasted link from those won’t work yet. For those, upload a screenshot or photo of the tag, measurements, or a flat-lay instead, and it works the same way.",
  },
];

const navLink = "font-mono text-xs font-semibold uppercase tracking-wide text-ink-soft hover:text-ink";
const primaryButton =
  "inline-block bg-ink px-7 py-4 font-mono text-sm font-semibold uppercase tracking-wider text-bg hover:bg-ink-soft";

// A pencil sketch of a listed dress with its measurements annotated, drawn in
// on load -- the "pattern still on the drafting table" feel of the brand.
function SketchedDress() {
  return (
    <figure className="paper-grid relative m-0 aspect-square w-full border border-line">
      <svg
        viewBox="0 0 520 520"
        className="absolute inset-0 h-full w-full"
        role="img"
        aria-label="A pencil sketch of a wrap dress with its bust, waist, hip and hem measurements annotated"
      >
        <g fill="none" stroke="#2b2925" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path className="sketch-draw" d="M210 70 q0 -18 16 -18 q16 0 14 15 q-2 10 -30 22 M210 89 L120 128 L300 128 L210 89" />
          <path
            className="sketch-draw"
            style={{ animationDelay: "0.6s" }}
            d="M168 130 L150 170 Q146 220 158 252 L98 470 Q210 494 322 470 L262 252 Q274 220 270 170 L252 130 Q232 150 210 192 Q188 150 168 130 Z"
          />
          <path
            className="sketch-draw"
            style={{ animationDelay: "1.2s" }}
            stroke="#8e8a82"
            strokeWidth="1.1"
            d="M158 252 Q210 266 262 252 M182 262 L150 474 M210 266 L210 484 M238 262 L270 474"
          />
        </g>
        <path
          className="sketch-draw"
          style={{ animationDelay: "1.2s" }}
          fill="none"
          stroke="#8e8a82"
          strokeWidth="1"
          strokeDasharray="4 5"
          d="M140 186 H420 M150 252 H420 M130 312 H420 M96 472 H420"
        />
        <path
          className="sketch-draw"
          style={{ animationDelay: "1.8s" }}
          fill="none"
          stroke="#5f5b54"
          strokeWidth="1"
          d="M60 130 V472 M52 130 H68 M52 472 H68"
        />
        <g fontFamily="Caveat, cursive" fontSize="24" fill="#3a3833">
          <text className="sketch-note" style={{ animationDelay: "1.6s" }} x="428" y="192">bust 36″</text>
          <text className="sketch-note" style={{ animationDelay: "1.6s" }} x="428" y="214" fontSize="19" fill="#3e5530">fitted ✓</text>
          <text className="sketch-note" style={{ animationDelay: "2s" }} x="428" y="258">waist 30″</text>
          <text className="sketch-note" style={{ animationDelay: "2s" }} x="428" y="280" fontSize="19" fill="#3e5530">2″ of room</text>
          <text className="sketch-note" style={{ animationDelay: "2.4s" }} x="428" y="318">hip 40″</text>
          <text className="sketch-note" style={{ animationDelay: "2.4s" }} x="428" y="340" fontSize="19" fill="#3e5530">2″ of room</text>
          <text className="sketch-note" style={{ animationDelay: "2.8s" }} x="428" y="478">hem</text>
          <text className="sketch-note" style={{ animationDelay: "2.8s" }} x="428" y="500" fontSize="19">at your knee</text>
          <text className="sketch-note" style={{ animationDelay: "2.8s" }} x="36" y="310" transform="rotate(-90 36 310)" fontSize="20">
            length 44″
          </text>
        </g>
      </svg>
    </figure>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 border-b border-line px-6 py-6">
        <Link href="/" className="flex items-center gap-3" aria-label="Mind the Fit home">
          <Mark size={34} />
          <Wordmark className="text-[28px]" />
        </Link>
        <nav aria-label="Main" className="flex flex-wrap items-center gap-6">
          <a href="#how-it-works" className={navLink}>
            How it works
          </a>
          <a href="#pricing" className={navLink}>
            Pricing
          </a>
          <Link href="/sign-in" className={navLink}>
            Sign in
          </Link>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-6">
        {/* Hero */}
        <section className="flex flex-wrap items-center gap-12 py-14">
          <div className="flex min-w-0 flex-[1_1_420px] flex-col gap-6">
            <p className="font-mono text-xs font-semibold uppercase tracking-wider text-ink-faint">
              Secondhand &amp; vintage, measured
            </p>
            <h1 className="text-5xl leading-[1.02] sm:text-[68px]">
              Know if it’ll <em>fit</em> — before you buy it.
            </h1>
            <p className="max-w-lg text-xl text-ink-soft">
              Share a secondhand or vintage listing and Mind the Fit reads the seller’s actual
              measurements, then tells you honestly how it will fit your body. No size-label guessing.
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-6">
              <Link href="/sign-up" className={primaryButton}>
                Try it free
              </Link>
              <a href="#how-it-works" className={`${navLink} underline underline-offset-[6px]`}>
                See how it works
              </a>
            </div>
          </div>
          <div className="min-w-0 flex-[1_1_420px]">
            <SketchedDress />
          </div>
        </section>

        {/* Why */}
        <section className="border-y border-line py-12">
          <p className="mx-auto max-w-3xl text-center font-display text-2xl leading-snug text-ink-soft sm:text-3xl">
            A vintage “M” and a fast-fashion “M” aren’t the same dress. Mind the Fit skips the
            label entirely and compares the garment’s <em>real</em> measurements to your real
            body.
          </p>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="scroll-mt-8 py-16">
          <h2 className="mb-10 text-4xl">How it works</h2>
          <div className="grid gap-10 sm:grid-cols-3">
            {STEPS.map((step) => (
              <div key={step.n} className="border-t border-ink pt-4">
                <p className="mb-2 font-display text-2xl italic">{step.n}</p>
                <h3 className="mb-2 text-2xl">{step.title}</h3>
                <p className="text-ink-soft">{step.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="scroll-mt-8 py-16">
          <h2 className="mb-10 text-4xl">Pricing</h2>
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="border border-line bg-bg p-8">
              <p className="mb-2 font-mono text-xs font-semibold uppercase tracking-wide text-ink-faint">Free</p>
              <p className="mb-4 font-display text-5xl">$0</p>
              <p className="mb-8 text-ink-soft">
                {FREE_CHECKS_PER_MONTH} fit checks every month. Full accuracy, no card required.
              </p>
              <Link
                href="/sign-up"
                className="inline-block border border-ink px-6 py-3 font-mono text-xs font-semibold uppercase tracking-wider hover:bg-ink hover:text-bg"
              >
                Get started free
              </Link>
            </div>
            <div className="border border-dashed border-ink/60 bg-bg p-8">
              <p className="mb-2 font-mono text-xs font-semibold uppercase tracking-wide">Plus</p>
              <p className="mb-4 font-display text-5xl">
                {PLUS_PRICE_LABEL}
                <span className="font-sans text-lg text-ink-faint">/mo</span>
              </p>
              <p className="mb-8 text-ink-soft">Unlimited fit checks. For anyone shopping secondhand regularly.</p>
              <Link href="/sign-up" className={primaryButton}>
                Try it free
              </Link>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-16">
          <h2 className="mb-8 text-4xl">Questions</h2>
          <div className="flex flex-col">
            {FAQS.map((item) => (
              <details key={item.q} className="border-t border-line last:border-b">
                <summary className="cursor-pointer py-5 font-display text-xl hover:text-ink-soft">{item.q}</summary>
                <p className="max-w-3xl pb-6 text-ink-soft">{item.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Final CTA */}
        <section className="paper-grid mb-16 border border-line px-6 py-14 text-center">
          <h2 className="mb-3 text-4xl">Stop guessing. Start checking.</h2>
          <p className="mx-auto mb-8 max-w-md text-ink-soft">
            Set up your measurements once, then check as many listings as you want.
          </p>
          <Link href="/sign-up" className={primaryButton}>
            Try it free
          </Link>
        </section>
      </main>

      <footer className="mx-auto max-w-6xl border-t border-line px-6 py-8 text-center">
        <a
          href="https://fractallab.co"
          className="font-mono text-xs font-semibold uppercase tracking-wide text-ink-faint hover:text-ink"
        >
          A Fractal Lab product
        </a>
      </footer>
    </div>
  );
}
