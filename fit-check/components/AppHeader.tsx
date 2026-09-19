import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { clerkEnabled } from "@/lib/auth";

// Clerk's default avatar (shown until a user uploads their own photo) is an
// auto-generated marble/swirl graphic with no supported way to recolor it --
// Clerk's `appearance.variables` only exposes `colorShimmer` for avatars, not
// the generated graphic's palette. So instead of fighting that, we hide
// whatever image Clerk would show and render a flat brand-colored circle
// with a plain person glyph in its place.
const AVATAR_GLYPH = encodeURIComponent(
  "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><circle cx='12' cy='8' r='4'/><path d='M4 20c0-4 3.5-7 8-7s8 3 8 7'/></svg>"
);

// Server component (not client) -- same reason as app/app/page.tsx: this
// Clerk version leaks server-only code into the client bundle if UserButton
// is imported from a "use client" file under Next 16.
export function AppHeader() {
  return (
    <header className="mb-8 flex items-center justify-between">
      <Link href="/app" className="font-mono text-xs uppercase tracking-wider text-pine">
        Mind the Fit
      </Link>
      <div className="flex items-center gap-4">
        <Link
          href="/app"
          className="font-mono text-xs uppercase tracking-wider text-ink-faint hover:text-accent"
        >
          New Fit
        </Link>
        <Link
          href="/app/history"
          className="font-mono text-xs uppercase tracking-wider text-ink-faint hover:text-accent"
        >
          History
        </Link>
        <Link
          href="/app/settings"
          aria-label="Settings"
          className="text-ink-faint hover:text-accent"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </Link>
        {clerkEnabled && (
          <UserButton
            appearance={{
              variables: { colorPrimary: "#8a6112" },
              elements: {
                avatarBox: { width: "28px", height: "28px" },
                userButtonAvatarBox: {
                  width: "28px",
                  height: "28px",
                  backgroundColor: "#8a6112",
                  backgroundImage: `url("data:image/svg+xml,${AVATAR_GLYPH}")`,
                  backgroundSize: "16px 16px",
                  backgroundPosition: "center",
                  backgroundRepeat: "no-repeat",
                },
                avatarImage: { display: "none" },
                userButtonAvatarImage: { display: "none" },
              },
            }}
          />
        )}
      </div>
    </header>
  );
}
