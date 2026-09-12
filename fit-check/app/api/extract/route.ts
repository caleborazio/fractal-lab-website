import { NextRequest, NextResponse } from "next/server";
import { extractMeasurements } from "@/lib/gemini";
import { fetchListing } from "@/lib/fetchListing";
import { getUserId } from "@/lib/auth";
import { checkUsage, recordUsage } from "@/lib/usage";
import { PLUS_PRICE_LABEL } from "@/lib/plan";

const MAX_TOTAL_IMAGES = 16;

export async function POST(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "Sign in to check a fit." }, { status: 401 });
  }

  const usage = await checkUsage(userId);
  if (!usage.allowed) {
    return NextResponse.json(
      {
        error: `You've used your ${usage.checksUsed} free checks this month. Upgrade to Mind the Fit Plus (${PLUS_PRICE_LABEL}/mo) for unlimited checks.`,
        usage,
      },
      { status: 402 }
    );
  }

  try {
    const body = await req.json();
    const uploadedImages: { base64: string; mimeType: string }[] = body.images ?? [];
    const listingText: string | undefined = body.listingText;

    if (uploadedImages.length === 0 && !listingText) {
      return NextResponse.json(
        { error: "Provide at least one image or some listing text." },
        { status: 400 }
      );
    }

    let combinedText = listingText;
    let combinedImages = uploadedImages;

    const urlMatch = listingText?.match(/https?:\/\/\S+/i);
    if (urlMatch) {
      const fetched = await fetchListing(urlMatch[0]);
      if (fetched) {
        combinedText = [fetched.text, listingText].filter(Boolean).join("\n\n");
        combinedImages = [...uploadedImages, ...fetched.images].slice(0, MAX_TOTAL_IMAGES);
      }
      // If the fetch fails (blocked, timed out, nothing usable), fall through
      // with the original pasted text/images -- an honest "no data" beats a hard error.
    }

    const result = await extractMeasurements(combinedImages, combinedText);
    // Only a successful extraction burns a free check -- a blocked/failed
    // fetch shouldn't cost someone part of their monthly allowance.
    await recordUsage(userId);
    const updatedUsage = await checkUsage(userId);

    // Echo back what was actually sent so the UI can show thumbnails --
    // the clearest way to catch a wrong-listing/mixed-photos scrape.
    const usedImages = combinedImages.map((img) => ({
      dataUrl: `data:${img.mimeType};base64,${img.base64}`,
    }));
    return NextResponse.json({ result, usedImages, usage: updatedUsage });
  } catch (err) {
    console.error("extract error", err);
    return NextResponse.json(
      { error: "Couldn't read that listing. Try a clearer photo of the tag or measurements." },
      { status: 500 }
    );
  }
}
