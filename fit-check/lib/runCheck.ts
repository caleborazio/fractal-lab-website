import type { Profile } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { extractMeasurements, type ExtractionResult } from "@/lib/gemini";
import {
  computeVerdict,
  estimateGarmentLanding,
  summarizeVerdict,
  READING_LABEL,
  type DimensionVerdict,
  type LandingEstimate,
} from "@/lib/fit";
import { checkUsage, recordUsage, type UsageStatus } from "@/lib/usage";

export interface CheckInput {
  images: { base64: string; mimeType: string }[];
  text?: string;
  sourceUrl?: string | null;
  /** Small data URLs or plain image URLs for the history list -- never
   * full-size image data. */
  thumbnails: string[];
}

export interface CheckOutcome {
  result: ExtractionResult;
  verdict: DimensionVerdict[];
  landing: LandingEstimate | null;
  checkId: string;
  usage: UsageStatus;
}

/**
 * Extract, score against the person's profile, and save to history in one
 * step -- the path for callers with no separate client-side save (browser
 * extension, iPhone Shortcut). Only call once there's something to read:
 * a successful extraction is what burns a free check.
 */
export async function runAndSaveCheck(profile: Profile, input: CheckInput): Promise<CheckOutcome> {
  const result = await extractMeasurements(input.images, input.text);
  await recordUsage(profile.id);
  const usage = await checkUsage(profile.id);

  const body = {
    bust: profile.bust,
    waist: profile.waist,
    hip: profile.hip,
    height: profile.height,
    inseam: profile.inseam,
    shoulderToInseam: profile.shoulderToInseam,
  };
  const verdict = computeVerdict(body, result);
  const byDimension = Object.fromEntries(verdict.map((d) => [d.dimension, d]));
  const landing = estimateGarmentLanding(result.garmentType, body, result);

  const check = await prisma.fitCheck.create({
    data: {
      profileId: profile.id,
      brand: result.brand,
      garmentType: result.garmentType,
      sourceUrl: input.sourceUrl ?? null,
      bust: byDimension.bust?.garment ?? null,
      waist: byDimension.waist?.garment ?? null,
      hip: byDimension.hip?.garment ?? null,
      length: result.length,
      rise: result.rise,
      inseam: result.inseam,
      rawExtraction: result as object,
      verdict: verdict as object,
      landing: (landing ?? undefined) as object | undefined,
      images: input.thumbnails.length > 0 ? input.thumbnails.slice(0, 6) : undefined,
      confirmed: true,
    },
  });

  return { result, verdict, landing, checkId: check.id, usage };
}

function inches(n: number): string {
  return Number.isInteger(n) ? `${n}"` : `${n.toFixed(1)}"`;
}

/**
 * Plain-text rendering for surfaces that can only show a block of text
 * (an iPhone Shortcut's result/alert). Leads with the verdict, keeps each
 * line short enough to read at a glance on a phone.
 */
export function formatCheckAsText(outcome: CheckOutcome): string {
  const { result, verdict, landing, usage } = outcome;
  const lines: string[] = [];

  const title = [result.brand, result.garmentType].filter(Boolean).join(" ");
  lines.push(result.size ? `${title} · size ${result.size}` : title);
  lines.push(summarizeVerdict(verdict).headline);

  for (const v of verdict) {
    if (v.reading === "no_data" || v.garment == null || v.ease == null) continue;
    const room = v.ease >= 0 ? `${inches(v.ease)} of room` : `${inches(Math.abs(v.ease))} short`;
    lines.push(`${v.dimension[0].toUpperCase()}${v.dimension.slice(1)}: ${inches(v.garment)} vs your ${inches(v.body)} — ${room} (${READING_LABEL[v.reading].toLowerCase()})`);
  }
  if (result.rise != null) lines.push(`Rise: ${inches(result.rise)}`);
  if (landing) lines.push(`Where it hits: ${landing.label}. ${landing.detail}`);
  if (result.fitNotes) lines.push(`Fit notes: ${result.fitNotes}`);
  if (result.measuredFromPhoto) lines.push("★ Measurements read from a photo — worth a glance yourself.");

  lines.push("");
  if (usage.checksRemaining !== null) {
    lines.push(`${usage.checksRemaining} free checks left this month.`);
  }
  lines.push("Full read saved in your history at mindthefit.com.");
  return lines.join("\n");
}
