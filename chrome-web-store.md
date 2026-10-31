# Chrome Web Store listing — Mind the Fit

Everything the Chrome Web Store developer dashboard asks for, ready to paste.

## Before you submit

1. **Developer account** — register at https://chrome.google.com/webstore/devconsole ($5, one time)
   with caleb@fractallab.co, declared as a **trader** (Fractal Lab LLC's business address; contact
   email support@mindthefit.com).
2. **Sign-in on production** — reviewers have to sign in to test anything, so move Clerk from its
   development instance to production first. Its users don't carry over, so a reviewer account made
   on the development instance would stop working.
3. **Reviewer account** — a Mind the Fit account with sample measurements saved, for the Test
   instructions tab (see below). The App Store review needs one too.
4. **Package** — run `sh scripts/package-chrome-extension.sh`; upload the `mind-the-fit-chrome-<version>.zip` it writes.
5. **Images** — all in `store-assets/chrome/`: `icon-128.png`, three 1280×800 screenshots and
   `promo-tile-440x280.png`. The screenshots are the real popup showing real listings' measurements
   scored against a made-up sample body (34/26.5/36.5, 5′5″) — no real person's measurements.
6. **After approval** — paste the listing URL into `fit-check/lib/install.ts` (`STORE_LINKS.chrome`)
   so the Add to Chrome button on mindthefit.com/get goes straight to it.

## Store listing — links

- **Homepage URL:** https://www.mindthefit.com
- **Support URL:** https://www.mindthefit.com/support
- **Privacy policy URL** (Privacy tab): https://www.mindthefit.com/privacy

## Store listing

**Name:** Mind the Fit

**Summary** (132 characters max):
Check if a secondhand or vintage listing will fit you, right from the page you're on.

**Category:** Shopping

**Language:** English

**Description:**

Size labels don't mean much secondhand — a vintage "M" can be almost anything. Mind the Fit reads a
listing's actual measurements and tells you how it will fit your body before you buy.

On any clothing listing, click the Mind the Fit icon. It reads the measurements the seller gave — in
the description, the comments, or a tape-measure photo — and compares them with yours:

• Bust, waist and hip, inch by inch: tight, fitted, comfortable or loose
• Where the hem or pant leg will land on you
• Flat "pit to pit" measurements doubled for you, so nothing is compared wrong
• Every check saved to your history at mindthefit.com

Works on Poshmark, ThredUp, eBay, Vinted, The RealReal and most other shops.

Sign in once with your Mind the Fit account — no codes to copy. Your measurements stay private and
are never shared.

## Privacy practices

**Single purpose:**
Checks whether a clothing listing on the current page will fit the user, by comparing the listing's
stated measurements with the measurements saved in the user's Mind the Fit account.

**Permission justifications:**

- **activeTab** — Reads the listing page the user is on, only when they click the extension's icon.
- **scripting** — Runs the page reader in that tab to collect the listing's text and photos for the
  fit check.
- **storage** — Keeps the user signed in to their Mind the Fit account between uses.
- **Host permission (mindthefit.com)** — Sends the listing to Mind the Fit for the fit check, and
  receives the sign-in hand-off from mindthefit.com when the user signs in.

**Remote code:** No, I am not using remote code.

**Data usage** — check these:

- **Authentication information** — the sign-in token for the user's Mind the Fit account.
- **Website content** — the text and photos of a listing the user chooses to check.
- **Web history** — the address of each listing the user checks, saved in their check history.

Then certify all three: not sold to third parties; not used or transferred for purposes unrelated to
the item's single purpose; not used or transferred to determine creditworthiness or for lending.

## Test instructions

Fill in the reviewer account's email and password (it has sample measurements saved):

> Mind the Fit compares a clothing listing's measurements with the user's own, so it needs an
> account. Sign in with the account below: click the extension's icon, choose Sign in, and sign in on
> the mindthefit.com page that opens — the extension connects on its own.
>
> Then open any clothing listing that states measurements and click the icon, for example a dress on
> poshmark.com or thredup.com whose description gives bust/pit-to-pit, waist or length. The popup
> shows how it would fit the sample measurements on this account.
>
> Email: …   Password: …
