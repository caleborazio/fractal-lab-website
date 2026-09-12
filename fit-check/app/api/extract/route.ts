import { NextRequest, NextResponse } from "next/server";
import { extractMeasurements } from "@/lib/gemini";
import { fetchListing } from "@/lib/fetchListing";

const MAX_TOTAL_IMAGES = 16;

export async function POST(req: NextRequest) {
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
    // Echo back what was actually sent so the UI can show thumbnails --
    // the clearest way to catch a wrong-listing/mixed-photos scrape.
    const usedImages = combinedImages.map((img) => ({
      dataUrl: `data:${img.mimeType};base64,${img.base64}`,
    }));
    return NextResponse.json({ result, usedImages });
  } catch (err) {
    console.error("extract error", err);
    return NextResponse.json(
      { error: "Couldn't read that listing. Try a clearer photo of the tag or measurements." },
      { status: 500 }
    );
  }
}
