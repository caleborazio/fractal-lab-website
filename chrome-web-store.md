# Chrome Web Store listing — Mind the Fit

Everything the Chrome Web Store developer dashboard asks for, ready to paste.

## Before you submit

1. **Developer account** — register at https://chrome.google.com/webstore/devconsole ($5, one time).
2. **Privacy policy URL** — required, and mindthefit.com doesn't have one yet (needed for the App Store too).
3. **Package** — run `sh scripts/package-chrome-extension.sh`; upload the `mind-the-fit-chrome-<version>.zip` it writes.
4. **Images** — the 128×128 icon is `fit-check-extension/icons/icon128.png`. Also needed: at least one
   screenshot (1280×800) of the popup over a listing, and a small promo tile (440×280).
5. **After approval** — paste the listing URL into `fit-check/lib/install.ts` (`STORE_LINKS.chrome`)
   so the Add to Chrome button on mindthefit.com/get goes straight to it.

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

Then certify all three: not sold to third parties; not used or transferred for purposes unrelated to
the item's single purpose; not used or transferred to determine creditworthiness or for lending.
