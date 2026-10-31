import type { Metadata } from "next";
import Link from "next/link";
import { PublicPage } from "@/components/PublicPage";
import { FEEDBACK_MAILTO, SUPPORT_EMAIL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Support — Mind the Fit",
  description: "Get help with Mind the Fit or send feedback.",
};

const QUESTIONS = [
  {
    q: "Mind the Fit isn't in my share sheet",
    a: "In the iPhone app, open Account and tap Put it first in your share sheet — it walks you through adding it to your Favorites.",
  },
  {
    q: "The extension says it isn't answering",
    a: "In Safari, click (or on iPhone, tap the page menu for) Mind the Fit and choose Always Allow on This Website, then reload. In Chrome, make sure the extension is turned on at chrome://extensions.",
  },
  {
    q: "A check missed measurements that are in the listing",
    a: "Send us the listing link — every miss we hear about makes the reader better for everyone.",
  },
  {
    q: "How do I delete my account?",
    a: "In the iPhone app: Account → Delete account. On the website: Settings → Delete account.",
  },
];

export default function SupportPage() {
  return (
    <PublicPage>
      <h1 className="mb-3 text-4xl">Support</h1>
      <p className="mb-6 max-w-prose text-sm text-ink-soft">
        Mind the Fit is in early access, so your questions and feedback go straight to the people
        building it. Email{" "}
        <a href={`mailto:${SUPPORT_EMAIL}`} className="text-ink underline">
          {SUPPORT_EMAIL}
        </a>{" "}
        and we’ll get back to you.
      </p>
      <a
        href={FEEDBACK_MAILTO}
        className="mb-10 inline-block border border-line-strong px-4 py-2 text-sm hover:border-ink"
      >
        Send feedback
      </a>

      <div className="flex flex-col gap-6">
        {QUESTIONS.map(({ q, a }) => (
          <section key={q}>
            <h2 className="mb-1 text-xl">{q}</h2>
            <p className="text-sm text-ink-soft">{a}</p>
          </section>
        ))}
      </div>

      <p className="mt-10 text-sm text-ink-faint">
        Setting up on a new device? <Link href="/get" className="underline hover:text-ink">Get Mind the Fit</Link>.
        How we handle your information: <Link href="/privacy" className="underline hover:text-ink">Privacy</Link>.
      </p>
    </PublicPage>
  );
}
