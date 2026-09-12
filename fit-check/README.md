# Fit Check (Fractal Lab)

Proof-of-concept: upload a secondhand/vintage listing (photo of a tag, a seller's
measurements, or a flat-lay) and find out if it'll actually fit you, without
guessing at size labels.

Category scope for v1: vintage dresses (bust / waist / hip / length).

## Stack

Same shape as CommishHQ: Next.js (App Router) + TypeScript + Tailwind v4 + Prisma.
No auth in v1 — an anonymous profile id is set as an httpOnly cookie the first
time someone saves their measurements.

- `app/page.tsx` — the whole flow: profile → upload/paste → confirm extraction → verdict → feedback
- `app/api/extract` — calls Gemini vision to read stated measurements from photos/text
- `app/api/profile`, `app/api/checks` — persistence via Prisma
- `lib/fit.ts` — the plain-arithmetic ease/tolerance verdict logic
- `lib/gemini.ts` — the vision extraction prompt + schema

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
extension, no multi-category support, no monetization. See the research/MVP
writeup for the fuller roadmap.
