import type { Metadata } from "next";
import type { ReactNode } from "react";
import { PublicPage } from "@/components/PublicPage";
import { SUPPORT_EMAIL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy — Mind the Fit",
  description: "What Mind the Fit stores, why, who helps run it, and how to delete your account.",
};

const UPDATED = "October 30, 2026";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="mb-3 text-2xl">{title}</h2>
      <div className="flex flex-col gap-3 text-sm text-ink-soft">{children}</div>
    </section>
  );
}

// Written from what the code actually stores and sends -- keep it in step
// when that changes (prisma/schema.prisma, lib/gemini.ts, the extensions).
export default function PrivacyPage() {
  return (
    <PublicPage>
      <h1 className="mb-2 text-4xl">Privacy</h1>
      <p className="mb-10 text-sm text-ink-faint">Last updated {UPDATED}</p>

      <p className="mb-8 max-w-prose text-sm text-ink-soft">
        Mind the Fit (from Fractal Lab) tells you how a clothing listing will fit you by comparing the
        listing’s measurements with yours. This page explains what we keep to do that. We don’t
        sell your information or use it for advertising.
      </p>

      <Section title="What we store">
        <p>
          <strong className="text-ink">Your account</strong> — your email address, plus your name and
          photo if you sign in with Google.
        </p>
        <p>
          <strong className="text-ink">Your measurements</strong> — bust, waist and hip, and height,
          inseam and shoulder-to-inseam if you add them. They’re used only to compare against
          listings.
        </p>
        <p>
          <strong className="text-ink">Your checks</strong> — for each listing you check: its link,
          the measurements we read from it, the fit result, small thumbnails of its photos, and how it
          fit if you tell us.
        </p>
        <p>
          <strong className="text-ink">Connections</strong> — when you sign in on the iPhone app or a
          browser extension, a record of that connection (its name and when it was last used) so you
          can see and remove it in Settings.
        </p>
        <p>
          <strong className="text-ink">Usage and plan</strong> — how many checks you’ve used this
          month, your plan, which link brought you to Mind the Fit if it was a shared one, and — if
          you subscribe — your Stripe customer and subscription IDs. We never see or store your card
          details.
        </p>
      </Section>

      <Section title="Reading listings">
        <p>
          A listing is only read when you ask for a check — by sharing it to the iPhone app, tapping
          the extension’s icon, or pasting it on mindthefit.com. The app and extensions don’t
          watch or record your browsing.
        </p>
        <p>
          The listing’s text and photos (or the screenshots you upload) are sent to Google’s
          Gemini API to read the measurements. For some sites, our server opens the listing link
          itself to read it.
        </p>
      </Section>

      <Section title="Who helps run Mind the Fit">
        <p>
          Clerk (sign-in), Vercel (hosting), Neon (database), Google (Gemini API, reading listings)
          and Stripe (payments, if you subscribe). Each handles your information only to provide its
          part of the service. Our hosting keeps standard server logs.
        </p>
        <p>
          The website uses cookies to keep you signed in and to remember a shared link that brought
          you here. The iPhone app and extensions keep your sign-in on your device.
        </p>
      </Section>

      <Section title="Deleting your account">
        <p>
          You can delete your account at any time: in the iPhone app under Account → Delete account,
          or on mindthefit.com under Settings → Delete account. This permanently removes your
          measurements, history, connections and sign-in, and cancels any subscription. Stripe keeps
          its own payment records as the law requires. You can also email us to ask.
        </p>
      </Section>

      <Section title="Children">
        <p>Mind the Fit isn’t meant for children under 13, and we don’t knowingly collect their information.</p>
      </Section>

      <Section title="Changes and contact">
        <p>
          If this policy changes, we’ll update the date above. Questions or requests:{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="text-ink underline">
            {SUPPORT_EMAIL}
          </a>
          .
        </p>
      </Section>
    </PublicPage>
  );
}
