import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

export type MeasurementConvention = "circumference" | "flat_half" | "unknown";

export interface ExtractionResult {
  brand: string | null;
  garmentType: string;
  size: string | null;
  bust: number | null;
  bustConvention: MeasurementConvention | null;
  waist: number | null;
  waistConvention: MeasurementConvention | null;
  hip: number | null;
  hipConvention: MeasurementConvention | null;
  length: number | null;
  unit: "in" | "cm";
  fitNotes: string | null;
  readFrom: string | null;
  measuredFromPhoto: boolean;
  confidence: "high" | "medium" | "low";
  summary: string;
}

const conventionSchema = {
  type: SchemaType.STRING,
  enum: ["circumference", "flat_half", "unknown"],
  nullable: true,
};

const responseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    brand: { type: SchemaType.STRING, nullable: true },
    garmentType: { type: SchemaType.STRING },
    size: { type: SchemaType.STRING, nullable: true },
    bust: { type: SchemaType.NUMBER, nullable: true },
    bustConvention: conventionSchema,
    waist: { type: SchemaType.NUMBER, nullable: true },
    waistConvention: conventionSchema,
    hip: { type: SchemaType.NUMBER, nullable: true },
    hipConvention: conventionSchema,
    length: { type: SchemaType.NUMBER, nullable: true },
    unit: { type: SchemaType.STRING, enum: ["in", "cm"] },
    fitNotes: { type: SchemaType.STRING, nullable: true },
    readFrom: { type: SchemaType.STRING, nullable: true },
    measuredFromPhoto: { type: SchemaType.BOOLEAN },
    confidence: { type: SchemaType.STRING, enum: ["high", "medium", "low"] },
    summary: { type: SchemaType.STRING },
  },
  required: ["garmentType", "unit", "measuredFromPhoto", "confidence", "summary"],
};

const PROMPT = `You are reading photo(s) and/or text from a single secondhand or vintage clothing listing (garment tags, a seller's handwritten measurement card, flat-lay photos, and/or listing text/description).

MEASUREMENT CONVENTIONS -- reason about this carefully, it's the part people get wrong:
Garments are almost always measured FLAT (laid on a table, front layer over back layer), not wrapped around a body. A single stated number for bust/chest, waist, or hip is usually HALF the actual circumference. "Pit to pit" or "armpit to armpit" means side-to-side across the flat garment -- that is HALF the way around, not the full bust measurement.
Signs a number is FLAT/HALF: words like "pit to pit," "flat," "laid flat," "side to side," "armpit to armpit"; or the number itself is implausibly small for an adult body measured around (roughly under 22in for adult bust/waist/hip almost always means flat/half, not full circumference).
Signs a number is FULL CIRCUMFERENCE: words like "circumference," "around," "wrap," "full"; or the number falls in a plausible full-body range (roughly 24-50in for adult bust/waist/hip).
If a photo shows a tape measure or ruler laid straight across a single flat layer of the garment (not wrapped around it), that supports flat/half too.
If you genuinely cannot tell which convention was used, set convention to "unknown" rather than guessing -- do not silently assume a number is doubled or not. Report the number exactly as stated either way; conversion happens downstream, not in your answer.

Only report a measurement if it is EXPLICITLY STATED somewhere -- on a tag, in a handwritten note, in listing text, or clearly readable in a photo. Do NOT estimate a measurement from the garment's visual proportions alone with no stated number or reference object.

Some resale sites (ThredUp is a common example) overlay a labeled measurement diagram on a photo -- a mannequin or dress-form silhouette with bust/waist/hip/length numbers pointing to it, sometimes captioned "mannequin measurements." Despite that caption, BUST/WAIST/HIP on a diagram like this are normally THIS SPECIFIC GARMENT'S own measurements: the item was fitted to an adjustable form and measured on it, which is exactly why those numbers differ from listing to listing. Treat bust/waist/hip from a single-item diagram like this as real garment data, same weight as a printed tag -- do not discount them just because the diagram is captioned "mannequin." This is different from a generic SIZE CHART showing multiple rows, one per size (S/M/L/XL each with its own range) -- a multi-row chart like that is NOT this garment's specific measurement and should be ignored.
However, treat any LENGTH number on that same diagram with real suspicion: on inspection this is frequently a fixed dimension of the mannequin/form itself, not the garment -- it can appear as the exact same number across completely different, unrelated listings, and can conflict directly with a length stated elsewhere on the same listing (e.g. diagram says 28in while the listing text says 54.5in for the same item). Only report a length from a diagram like this if you have some corroborating reason to trust it (it varies plausibly with the garment, or roughly matches a length stated elsewhere); otherwise leave length null rather than reporting a number likely describing the display form and not the item, and say so in the summary if you're withholding it for this reason.

The listing text you're given may include a "Buyer/seller comments" section -- sellers very often answer exact measurement questions there even when the main description has none. Treat a seller's reply in the comments the same as listing text for sourcing a measurement.

The listing's stated SIZE LABEL (e.g. "size 4", "US 6", "M") is a separate thing from actual measurements -- vintage and even some current sizing runs small/large/inconsistent relative to that label, which is the whole reason measurements matter more than the label. Report the size label if stated, but don't treat it as a substitute for a real measurement.

Also look for descriptive language anywhere in the text that hints at how forgiving the fit is, even without numbers -- words like "stretchy," "rigid," "structured," "boning," "flowy," "true to size," "runs small," "runs large," "some give," "no stretch." Summarize this briefly as fitNotes if anything like this appears; null if nothing relevant is said.

If the title and description seem to describe different garments (mismatched color, style, or details), or sizing info conflicts between two sources (e.g. the description says one number and a comment says another), say so explicitly in the summary rather than silently picking one -- this happens on real listings (sellers reusing a template description, or cross-posting mistakes) and the shopper should know if the source data itself looked inconsistent.

Return:
- brand: the brand name if visible, else null
- garmentType: what kind of garment this is (default "dress" if unclear)
- size: the stated size label if given (e.g. "4", "US 6", "M"), else null
- bust, waist, hip: the RAW number exactly as stated (do not pre-double it), each with its own convention judgment (bustConvention, waistConvention, hipConvention)
- length: garment length top-to-hem if stated (no convention ambiguity for this one)
- unit: "in" or "cm" -- whichever unit the source used (assume "in" if ambiguous)
- fitNotes: a brief note on stretch/structure/fit-relevant language found in the text, else null
- readFrom: a short quote or description of exactly where you read each number from (e.g. "tag says Bust 36in, Waist 30in" or "seller's description: '48 inches long, 16 inches bust (flexible)'" or "seller's comment reply: 'Pit: 15.5in, waist: 13in'" or "measurement diagram overlaid on photo 2")
- measuredFromPhoto: true if the bust/waist/hip/length numbers you're reporting came primarily from something you read IN A PHOTO (a diagram, tag, or handwritten card) rather than typed listing text -- false if they came from the listing text/description/comments instead
- confidence: "high" if numbers were printed/typed and clear, "medium" if handwritten or slightly unclear, "low" if you're unsure you read them correctly
- summary: 2-4 plain-English sentences a shopper can quickly sanity-check -- what you found, which source each came from (a specific photo, the listing text, a comment, a tag), call out explicitly any number you judged to be a flat/half measurement so they know it'll be doubled for comparison, and flag any inconsistency you noticed between sources

Respond with JSON only, matching the schema.`;

let client: GoogleGenerativeAI | null = null;

function getClient() {
  if (!client) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
    client = new GoogleGenerativeAI(apiKey);
  }
  return client;
}

/**
 * images: base64-encoded strings (no data: prefix), each with its mime type.
 * Model name is env-configurable since Google's current recommended flash
 * model name shifts over time -- check aistudio.google.com if this 404s.
 */
export async function extractMeasurements(
  images: { base64: string; mimeType: string }[],
  listingText?: string
): Promise<ExtractionResult> {
  const modelName = process.env.GEMINI_MODEL || "gemini-flash-latest";
  const model = getClient().getGenerativeModel({
    model: modelName,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema,
    },
  });

  const parts: Array<
    { text: string } | { inlineData: { data: string; mimeType: string } }
  > = [{ text: PROMPT }];

  if (listingText) {
    parts.push({ text: `Listing text pasted by the buyer:\n${listingText}` });
  }
  for (const img of images) {
    parts.push({ inlineData: { data: img.base64, mimeType: img.mimeType } });
  }

  const result = await model.generateContent(parts);
  const text = result.response.text();
  const parsed = JSON.parse(text) as ExtractionResult;

  // Sanity bounds -- a misread digit shouldn't be trusted silently.
  // Range is wide on purpose since raw values may legitimately be flat/half (small) or full circumference (larger).
  const inBounds = (v: number | null | undefined) => v == null || (v > 3 && v < 80);
  if (
    !inBounds(parsed.bust) ||
    !inBounds(parsed.waist) ||
    !inBounds(parsed.hip) ||
    !inBounds(parsed.length)
  ) {
    parsed.confidence = "low";
  }

  return parsed;
}
