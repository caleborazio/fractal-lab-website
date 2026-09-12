import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

export interface ExtractionResult {
  brand: string | null;
  garmentType: string;
  bust: number | null;
  waist: number | null;
  hip: number | null;
  length: number | null;
  unit: "in" | "cm";
  readFrom: string | null;
  confidence: "high" | "medium" | "low";
}

const responseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    brand: { type: SchemaType.STRING, nullable: true },
    garmentType: { type: SchemaType.STRING },
    bust: { type: SchemaType.NUMBER, nullable: true },
    waist: { type: SchemaType.NUMBER, nullable: true },
    hip: { type: SchemaType.NUMBER, nullable: true },
    length: { type: SchemaType.NUMBER, nullable: true },
    unit: { type: SchemaType.STRING, enum: ["in", "cm"] },
    readFrom: { type: SchemaType.STRING, nullable: true },
    confidence: { type: SchemaType.STRING, enum: ["high", "medium", "low"] },
  },
  required: ["garmentType", "unit", "confidence"],
};

const PROMPT = `You are reading photo(s) of a single secondhand or vintage clothing listing (a garment tag, a seller's handwritten measurement card, a flat-lay, and/or a screenshot of the listing text).

Only report a measurement (bust, waist, hip, length) if it is EXPLICITLY WRITTEN somewhere in the image as text or numbers — on a tag, in a handwritten note, or in listing text. Do NOT estimate or guess a measurement from the garment's visual proportions alone; if no reference object or ruler makes that reliable, leave that field null instead of guessing.

Return:
- brand: the brand name if visible, else null
- garmentType: what kind of garment this is (default "dress" if unclear)
- bust, waist, hip, length: the stated flat-measurement numbers if present, else null
- unit: "in" or "cm" — whichever unit the source used (assume "in" if ambiguous)
- readFrom: a short quote or description of exactly where you read each number from (e.g. "tag says Bust 36in, Waist 30in")
- confidence: "high" if numbers were printed/typed and clear, "medium" if handwritten or slightly unclear, "low" if you're unsure you read them correctly

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
  const modelName = process.env.GEMINI_MODEL || "gemini-2.0-flash";
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
  const inBounds = (v: number | null | undefined) =>
    v == null || (v > 5 && v < 100);
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
