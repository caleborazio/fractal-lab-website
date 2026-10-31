import Link from "next/link";
import type { ReactNode } from "react";
import { Mark, Wordmark } from "@/components/Brand";
import { SiteFooter } from "@/components/SiteFooter";

/** Frame for the plain public pages (install, privacy, support): the
 * wordmark home link, a readable column, and the site footer. */
export function PublicPage({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <main className="mx-auto w-full max-w-xl flex-1 px-5 py-8">
        <header className="mb-10 border-b border-line pb-4">
          <Link href="/" aria-label="Mind the Fit home" className="flex items-center gap-2.5">
            <Mark size={28} />
            <Wordmark className="text-[22px]" />
          </Link>
        </header>
        {children}
      </main>
      <SiteFooter className="mx-auto w-full max-w-xl" />
    </div>
  );
}
