# App Store listing — Mind the Fit (iPhone, plus the Mac app for Safari)

Everything App Store Connect asks for, ready to paste. Character limits are App Store Connect's.
Companion to `chrome-web-store.md`.

## Before you submit

1. **Apple Developer Program** as an Organization (Fractal Lab LLC) — D-U-N-S requested 2026-10-30.
2. **Sign-in on production + Sign in with Apple** — App Review requires Sign in with Apple because the
   app offers Google sign-in (guideline 4.8). Set both up in Clerk's production instance.
3. **Reviewer account** — the same one as the Chrome Web Store test instructions, with sample
   measurements saved.
4. **iPhone only for launch** — the targets are set to iPhone + iPad (`TARGETED_DEVICE_FAMILY = "1,2"`),
   which means iPad screenshots and iPad review testing too. Setting it to iPhone (`1`) skips both;
   the app still runs on iPad in iPhone mode.
5. **Screenshots** — see the plan at the bottom.

## App information

- **Name** (30): Mind the Fit
  - If the name is taken, fall back to: Mind the Fit — Fit Checker
- **Subtitle** (30): Secondhand fit, before you buy
- **Primary category:** Shopping  **Secondary:** Lifestyle
- **Content rights:** doesn't contain third-party content it lacks rights to (it reads listings the
  user chooses; nothing is republished)
- **Age rating:** answer None to every question → 4+
- **Copyright:** 2026 Fractal Lab LLC
- **Support URL:** https://www.mindthefit.com/support
- **Marketing URL:** https://www.mindthefit.com
- **Privacy policy URL:** https://www.mindthefit.com/privacy

## Version page

**Promotional text** (170):
Size labels mean little secondhand. Share any listing to Mind the Fit and see how it fits your body — bust, waist, hip and where the hem lands — before you buy.

**Keywords** (100, no spaces after commas — and no other apps' names, guideline 2.3.7):
vintage,secondhand,thrift,resale,measurements,sizing,clothes,dress,fit check,preloved,tape measure

**Description** (4000):

A vintage "M" can be almost anything. Mind the Fit reads a listing's actual measurements and tells
you how it will fit your body before you buy.

Find something you love in your favorite resale app, tap Share, and choose Mind the Fit. It reads the
measurements the seller gave — in the description, the comments, or a tape-measure photo — and
compares them with yours, right there in the share sheet:

• Bust, waist and hip, inch by inch: tight, fitted, comfortable or loose
• Where the hem or pant leg will land on you — knee, mid-calf, ankle or floor
• Flat "pit to pit" measurements doubled for you, and centimeters converted, so nothing is compared wrong
• Every check saved to your history, with a note of how it actually fit when it arrives

Works from the share button in shopping apps and in Safari, and as a Safari extension on iPhone and Mac.
Add your measurements once — they stay private and are never shared or sold.

Mind the Fit is in early access. Tell us what it gets wrong at support@mindthefit.com — every listing
we hear about makes it better.

**What's New** (first version): First release.

## App Review information

- **Sign-in required:** yes — the reviewer account's email and password.
- **Contact:** Caleb Orazio, support@mindthefit.com, plus a phone number.
- **Notes:**

> Mind the Fit compares a clothing listing's measurements with the user's own body measurements.
> The reviewer account already has sample measurements saved.
>
> To try it: open Safari, go to a clothing listing that states measurements (for example a dress on
> poshmark.com or thredup.com), tap Share, and choose Mind the Fit. The share sheet reads the page
> and shows the fit. You can also paste a listing link on the Check tab in the app.
>
> There are no purchases in the app. Account deletion: Account tab → Delete account.

## App Privacy (the "nutrition label")

**Data used to track you:** None. **Third-party advertising:** none.

Data linked to the user, all for **App Functionality** only:

| App Store data type | What it is in Mind the Fit |
|---|---|
| Contact Info → Email Address | Sign-in email |
| Contact Info → Name | From Google / Apple sign-in, if shared |
| Health & Fitness → Health | Body measurements (bust, waist, hip, height, inseam). Apple's HealthKit counts height and waist circumference as body measurements, so this is the safe category |
| Browsing History | Addresses of the listings the user checks, kept in their history |
| User Content → Other User Content | How a checked item actually fit, if the user records it |
| Identifiers → User ID | Account ID |

Not collected: location, contacts, photos of the user, financial info, purchases in the app,
diagnostics, usage analytics.

(Gemini reads listings server-side — that's processing for App Functionality, not tracking.)

## Export compliance

`ITSAppUsesNonExemptEncryption = NO` is already in both apps' settings (HTTPS only), so TestFlight
won't ask.

## Screenshot plan

Required: **iPhone 6.9″** (1320 × 2868), 3–5 shots. Mac app: at least one 1280 × 800 (the Chrome
screenshots' layout works, with Safari's toolbar).

Captured on an iPhone 17 Pro Max simulator, signed in to the reviewer account (sample measurements,
so no real person's measurements appear):

1. **Share sheet result** over a listing — "Know how it fits before you buy."
2. **Where it lands** card — "See where the hem lands on you."
3. **A "runs snug" result** — "Catch the ones that won't fit."
4. **History** — "Every check, saved — with how it actually fit."
5. **Measurements screen** — "Add your measurements once."
