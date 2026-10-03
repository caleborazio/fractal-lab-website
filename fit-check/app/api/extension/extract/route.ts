import { NextRequest, NextResponse } from "next/server";
import { getProfileIdFromExtensionToken } from "@/lib/extensionAuth";
import { checkUsage } from "@/lib/usage";
import { prisma } from "@/lib/prisma";
import { PLUS_PRICE_LABEL } from "@/lib/plan";
import { fetchImageAsBase64, upgradeImageUrl } from "@/lib/fetchListing";
import { runAndSaveCheck } from "@/lib/runCheck";

// On some sites (confirmed on ThredUp) the image CDN doesn't allow anonymous
// CORS at all, so every gallery photo -- not just the odd tainted one --
// ends up needing this fallback, even though the CDN itself is completely
// open to a plain server-side fetch. Matches the client's own capture cap
// so a listing's full photo set doesn't get truncated here after already
// surviving the client-side size/gallery filtering.
const MAX_FALLBACK_IMAGE_URLS = 8;

// The whole point of the extension is that it reads the page the person is
// already looking at, in their own authenticated browser -- so unlike
// /api/extract, there's no server-side fetchListing() fallback here: the
// page text and photos below were already scraped client-side by the
// content script, which is precisely what bypasses the bot detection that
// blocks a server-side fetch of the same URL.
export async function POST(req: NextRequest) {
  const profileId = await getProfileIdFromExtensionToken(req);
  if (!profileId) {
    return NextResponse.json(
      {
        error:
          "This extension isn't connected. Generate a connection code from Settings on mindthefit.com and paste it into the extension.",
      },
      { status: 401 }
    );
  }

  const profile = await prisma.profile.findUnique({ where: { id: profileId } });
  if (!profile) {
    return NextResponse.json({ error: "Account not found." }, { status: 404 });
  }

  const usage = await checkUsage(profileId);
  if (!usage.allowed) {
    return NextResponse.json(
      {
        error: `You've used your ${usage.checksUsed} free checks this month. Upgrade to Mind the Fit Plus (${PLUS_PRICE_LABEL}/mo) for unlimited checks.`,
        usage,
      },
      { status: 402 }
    );
  }

  const body = await req.json();
  const images: { base64: string; mimeType: string }[] = body.images ?? [];
  const pageText: string | undefined = body.pageText;
  const sourceUrl: string | undefined = body.sourceUrl;
  // Small downscaled copies for the history list, same idea as the web
  // app's client-side downscale() -- capped the same way (see FitCheckApp).
  const thumbnails: string[] = Array.isArray(body.thumbnails) ? body.thumbnails.slice(0, 6) : [];
  // Photos the content script found but couldn't read off a canvas -- the
  // site's own <img> was loaded without permissive CORS headers, which
  // taints canvas reads regardless of whether the page itself is
  // bot-protected. A direct server-side fetch of the image URL often still
  // works even when the same site blocks a server-side fetch of the HTML
  // page, since image CDNs are frequently unprotected static asset hosts.
  // Also sent by the iPhone share extension, which reads the page on the
  // phone and passes photo links rather than image data. Upgrade known
  // thumbnail links to full size first, then dedupe (thumb + full of the
  // same photo collapse to one).
  const imageUrls: string[] = Array.isArray(body.imageUrls)
    ? [
        ...new Set(
          (body.imageUrls as unknown[])
            .filter((u): u is string => typeof u === "string")
            .map(upgradeImageUrl)
        ),
      ].slice(0, MAX_FALLBACK_IMAGE_URLS)
    : [];

  if (images.length === 0 && imageUrls.length === 0 && !pageText) {
    return NextResponse.json(
      { error: "Didn't find any listing text or photos on this page." },
      { status: 400 }
    );
  }

  try {
    const recovered = await Promise.all(imageUrls.map((url) => fetchImageAsBase64(url)));
    const recoveredImages = recovered.filter((img): img is { base64: string; mimeType: string } => !!img);
    const imagesStillUnreadable = imageUrls.length - recoveredImages.length;
    const allImages = [...images, ...recoveredImages];

    const outcome = await runAndSaveCheck(profile, {
      images: allImages,
      text: pageText,
      sourceUrl,
      thumbnails,
    });

    return NextResponse.json({
      ...outcome,
      imagesUsed: allImages.length,
      imagesUnreadable: imagesStillUnreadable,
    });
  } catch (err) {
    console.error("extension extract error", err);
    return NextResponse.json(
      { error: "Couldn't read this page. Try again, or check it from mindthefit.com instead." },
      { status: 500 }
    );
  }
}
