export type Dimension = "bust" | "waist" | "hip";
export type MeasurementConvention = "circumference" | "flat_half" | "unknown";

export interface BodyProfile {
  bust: number;
  waist: number;
  hip: number;
  height?: number | null;
}

export interface GarmentMeasurements {
  bust?: number | null;
  bustConvention?: MeasurementConvention | null;
  waist?: number | null;
  waistConvention?: MeasurementConvention | null;
  hip?: number | null;
  hipConvention?: MeasurementConvention | null;
  length?: number | null;
}

export type FitReading = "tight" | "fitted" | "comfortable" | "loose" | "no_data";

export interface DimensionVerdict {
  dimension: Dimension;
  raw: number | null;
  convention: MeasurementConvention | null;
  garment: number | null;
  body: number;
  ease: number | null;
  reading: FitReading;
}

export const READING_LABEL: Record<FitReading, string> = {
  tight: "Will be tight",
  fitted: "Fitted, true to size",
  comfortable: "Comfortable, room to move",
  loose: "Loose / oversized",
  no_data: "No measurement to compare",
};

/**
 * Ease bands are a first-pass heuristic for a fitted vintage dress, in inches.
 * Tune these once real "how did it actually fit" feedback (see FitCheck.actualFit)
 * starts coming in — that feedback loop is the point, not these exact numbers.
 */
function readingForEase(ease: number): FitReading {
  if (ease < 0) return "tight";
  if (ease < 2) return "fitted";
  if (ease < 5) return "comfortable";
  return "loose";
}

/**
 * Garments are usually measured flat (front layer over back), so a stated
 * bust/waist/hip number is often HALF the actual circumference -- "pit to
 * pit" being the classic example. Doubling only happens when we're confident
 * that's the convention; "unknown" is treated as already-circumference,
 * since assuming a wrong double is a bigger, more confusing error than
 * leaving it as stated (the raw number is always shown too, so a person can
 * catch either mistake).
 */
function circumferenceEquivalent(
  value: number | null | undefined,
  convention: MeasurementConvention | null | undefined
): number | null {
  if (value == null || value <= 0) return null;
  return convention === "flat_half" ? value * 2 : value;
}

export function computeVerdict(body: BodyProfile, garment: GarmentMeasurements): DimensionVerdict[] {
  const dims: Dimension[] = ["bust", "waist", "hip"];
  const rawFor: Record<Dimension, number | null | undefined> = {
    bust: garment.bust,
    waist: garment.waist,
    hip: garment.hip,
  };
  const conventionFor: Record<Dimension, MeasurementConvention | null | undefined> = {
    bust: garment.bustConvention,
    waist: garment.waistConvention,
    hip: garment.hipConvention,
  };

  return dims.map((dimension) => {
    const raw = rawFor[dimension] ?? null;
    const convention = conventionFor[dimension] ?? null;
    const b = body[dimension];
    const g = circumferenceEquivalent(raw, convention);

    if (g == null) {
      return { dimension, raw, convention, garment: null, body: b, ease: null, reading: "no_data" };
    }
    const ease = g - b;
    return { dimension, raw, convention, garment: g, body: b, ease, reading: readingForEase(ease) };
  });
}
