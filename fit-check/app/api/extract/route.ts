import { NextRequest, NextResponse } from "next/server";
import { extractMeasurements } from "@/lib/gemini";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const images: { base64: string; mimeType: string }[] = body.images ?? [];
    const listingText: string | undefined = body.listingText;

    if (images.length === 0 && !listingText) {
      return NextResponse.json(
        { error: "Provide at least one image or some listing text." },
        { status: 400 }
      );
    }

    const result = await extractMeasurements(images, listingText);
    return NextResponse.json({ result });
  } catch (err) {
    console.error("extract error", err);
    return NextResponse.json(
      { error: "Couldn't read that listing. Try a clearer photo of the tag or measurements." },
      { status: 500 }
    );
  }
}
