import Link from "next/link";
import { FEEDBACK_MAILTO } from "@/lib/site";

const footerLink = "font-mono text-xs font-semibold uppercase tracking-wide text-ink-faint hover:text-ink";

/** The public pages' footer: install, the policies the app stores require,
 * and a way to reach a person. */
export function SiteFooter({ className = "" }: { className?: string }) {
  return (
    <footer className={`border-t border-line px-6 py-8 text-center ${className}`}>
      <nav aria-label="Footer" className="mb-4 flex flex-wrap justify-center gap-x-6 gap-y-2">
        <Link href="/get" className={footerLink}>
          Get the app
        </Link>
        <Link href="/privacy" className={footerLink}>
          Privacy
        </Link>
        <Link href="/support" className={footerLink}>
          Support
        </Link>
        <a href={FEEDBACK_MAILTO} className={footerLink}>
          Feedback
        </a>
      </nav>
      <a href="https://fractallab.co" className={footerLink}>
        A Fractal Lab product
      </a>
    </footer>
  );
}
