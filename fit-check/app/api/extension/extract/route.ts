import { NextRequest, NextResponse } from "next/server";
import { extractMeasurements } from "@/lib/gemini";
import { computeVerdict } from "@/lib/fit";
import { getProfileIdFromExtensionToken } from "@/lib/extensionAuth";
import { checkUsage, recordUsage } from "@/lib/usage";
import { prisma } from "@/lib/prisma";
import { PLUS_PRICE_LABEL } from "@/lib/plan";
import { fetchImageAsBase64 } from "@/lib/fetchListing";

const MAX_FALLBACK_IMAGE_URLS = 4;

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
  const imageUrls: string[] = Array.isArray(body.imageUrls)
    ? body.imageUrls.slice(0, MAX_FALLBACK_IMAGE_URLS)
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

    const result = await extractMeasurements(allImages, pageText);
    // Only a successful extraction burns a free check, same rule as the web app.
    await recordUsage(profileId);
    const updatedUsage = await checkUsage(profileId);

    const verdict = computeVerdict(
      { bust: profile.bust, waist: profile.waist, hip: profile.hip, height: profile.height },
      result
    );
    const byDimension = Object.fromEntries(verdict.map((d) => [d.dimension, d]));

    const check = await prisma.fitCheck.create({
      data: {
        profileId,
        brand: result.brand,
        garmentType: result.garmentType,
        sourceUrl: sourceUrl ?? null,
        bust: byDimension.bust?.garment ?? null,
        waist: byDimension.waist?.garment ?? null,
        hip: byDimension.hip?.garment ?? null,
        length: result.length,
        rawExtraction: result as object,
        verdict: verdict as object,
        images: thumbnails.length > 0 ? thumbnails : undefined,
        confirmed: true,
      },
    });

    return NextResponse.json({
      result,
      verdict,
      checkId: check.id,
      usage: updatedUsage,
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
