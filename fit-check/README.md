# Mind the Fit (Fractal Lab)

Proof-of-concept: upload a secondhand/vintage listing (photo of a tag, a seller's
measurements, or a flat-lay) and find out if it'll actually fit you, without
guessing at size labels.

Category scope for v1: vintage dresses (bust / waist / hip / length).

## Stack

Same shape as CommishHQ: Next.js (App Router) + TypeScript + Tailwind v4 + Prisma
+ Clerk. Auth follows CommishHQ's dev-bypass pattern (`lib/auth.ts`): with no
Clerk keys set, every visitor is "dev-user" and the whole product runs
end-to-end with no accounts configured; add real keys to require sign-in.
A Profile is keyed by Clerk user id, so signing in is what "builds your
profile" — there's no separate anonymous state anymore.

- `app/page.tsx` — public marketing page: what it does, how it works, pricing, FAQ. No auth.
- `app/app/page.tsx` — server component: the sign-in gate, then renders `FitCheckApp`
- `components/FitCheckApp.tsx` — the whole client flow: profile → upload/paste → confirm extraction → verdict → feedback
- `app/api/extract` — calls Gemini vision to read stated measurements from photos/text; enforces the free-tier monthly cap (`lib/usage.ts`)
- `app/api/profile`, `app/api/checks` — persistence via Prisma
- `app/api/checkout`, `app/api/webhooks/stripe`, `app/api/billing-portal` — Stripe subscription billing
- `lib/fit.ts` — the plain-arithmetic ease/tolerance verdict logic
- `lib/gemini.ts` — the vision extraction prompt + schema
- `lib/plan.ts` — the one place the Plus price and free-check allowance are defined

## Setup

```bash
npm install
cp .env.example .env.local   # then fill in GEMINI_API_KEY and DATABASE_URL
npx prisma migrate dev --name init
npm run dev
```

`GEMINI_API_KEY`: https://aistudio.google.com/apikey (free tier is fine for a POC)

`DATABASE_URL`: any Postgres works — Vercel Postgres (via the Storage tab in
your Vercel project) is the path of least resistance since this deploys to
Vercel anyway.

## What's deliberately not here yet

No vintage/brand sizing-drift dataset — this compares a listing's own stated
measurements straight against your body profile. No native app, no browser
extension, no multi-category support. See the research/MVP writeup for the
fuller roadmap.

Free tier is 5 checks/month (`lib/plan.ts`), Plus is $4.99/mo, billed via
Stripe subscriptions (test mode by default — see `STRIPE_SECRET_KEY` in
`.env.example`). Checkout supports promotion codes out of the box.
