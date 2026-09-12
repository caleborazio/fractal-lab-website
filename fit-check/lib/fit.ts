export type Dimension = "bust" | "waist" | "hip";

export interface BodyProfile {
  bust: number;
  waist: number;
  hip: number;
  height?: number | null;
}

export interface GarmentMeasurements {
  bust?: number | null;
  waist?: number | null;
  hip?: number | null;
  length?: number | null;
}

export type FitReading = "tight" | "fitted" | "comfortable" | "loose" | "no_data";

export interface DimensionVerdict {
  dimension: Dimension;
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

export function computeVerdict(
  body: BodyProfile,
  garment: GarmentMeasurements
): DimensionVerdict[] {
  const dims: Dimension[] = ["bust", "waist", "hip"];
  return dims.map((dimension) => {
    const g = garment[dimension];
    const b = body[dimension];
    if (g == null || g <= 0) {
      return { dimension, garment: null, body: b, ease: null, reading: "no_data" };
    }
    const ease = g - b;
    return { dimension, garment: g, body: b, ease, reading: readingForEase(ease) };
  });
}
