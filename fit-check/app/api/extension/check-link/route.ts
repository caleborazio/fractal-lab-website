import { NextRequest, NextResponse } from "next/server";
import { getProfileIdFromExtensionToken } from "@/lib/extensionAuth";
import { checkUsage } from "@/lib/usage";
import { prisma } from "@/lib/prisma";
import { PLUS_PRICE_LABEL } from "@/lib/plan";
import { fetchListing } from "@/lib/fetchListing";
import { formatCheckAsText, runAndSaveCheck } from "@/lib/runCheck";

// For clients that only have a listing LINK, not the rendered page -- an
// iPhone Shortcut run from a share sheet or from a copied link. Unlike
// /api/extension/extract, the server does the reading here, so this only
// works for sites that don't block server-side fetches (Poshmark, Vinted);
// Depop/ThredUp need the page read on the phone itself.
//
// ?format=text returns a plain, human-readable message with status 200 for
// every handled outcome (including errors): a Shortcut simply displays
// whatever body comes back, so the message itself has to say what to do.
export async function POST(req: NextRequest) {
  const asText = req.nextUrl.searchParams.get("format") === "text";
  const reply = (message: string, status: number, extra: Record<string, unknown> = {}) =>
    asText
      ? new NextResponse(message, { status: 200, headers: { "Content-Type": "text/plain; charset=utf-8" } })
      : NextResponse.json({ ...extra, message, error: status >= 400 ? message : undefined }, { status });

  const profileId = await getProfileIdFromExtensionToken(req);
  if (!profileId) {
    return reply(
      "This isn't connected to your Mind the Fit account yet. In Mind the Fit → Settings → Connections, copy your connection code into this Shortcut.",
      401
    );
  }
  const profile = await prisma.profile.findUnique({ where: { id: profileId } });
  if (!profile) return reply("Account not found.", 404);

  const usage = await checkUsage(profileId);
  if (!usage.allowed) {
    return reply(
      `You've used your ${usage.checksUsed} free checks this month. Upgrade to Mind the Fit Plus (${PLUS_PRICE_LABEL}/mo) at mindthefit.com for unlimited checks.`,
      402,
      { usage }
    );
  }

  // Accept JSON ({ url } or { text }) or a raw text body -- whatever the
  // Shortcut hands over (share-sheet text often wraps the link in a sentence).
  const raw = await req.text();
  let input = raw;
  try {
    const parsed = JSON.parse(raw);
    input = [parsed?.url, parsed?.text].filter((s) => typeof s === "string").join(" ");
  } catch {
    // Not JSON -- treat the whole body as text.
  }
  const url = input.match(/https?:\/\/\S+/i)?.[0];
  if (!url) {
    return reply(
      "No listing link found. Tap Copy Link on the listing first (Poshmark), or share the listing straight to this Shortcut.",
      400
    );
  }

  const fetched = await fetchListing(url);
  if (!fetched) {
    let host = "That site";
    try {
      host = new URL(url).hostname.replace(/^www\./, "");
    } catch {}
    // A failed read doesn't burn a free check -- nothing was actually checked.
    return reply(
      `${host} blocks Mind the Fit from reading listings from our server (Depop and ThredUp both do). That's what the Mind the Fit iPhone app will fix by reading the listing on your phone. For now, upload a screenshot of the measurements at mindthefit.com.`,
      422
    );
  }

  try {
    const outcome = await runAndSaveCheck(profile, {
      images: fetched.images,
      text: fetched.text,
      sourceUrl: url,
      thumbnails: fetched.imageUrls,
    });
    return asText
      ? reply(formatCheckAsText(outcome), 200)
      : NextResponse.json({ ...outcome, imagesUsed: fetched.images.length });
  } catch (err) {
    console.error("check-link error", err);
    return reply("Couldn't read that listing right now. Try again in a moment.", 500);
  }
}
