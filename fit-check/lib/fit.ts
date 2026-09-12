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

export interface OverallVerdict {
  headline: string;
  tone: "good" | "warn" | "neutral";
}

const DIMENSION_LABEL: Record<Dimension, string> = { bust: "bust", waist: "waist", hip: "hip" };

/**
 * One actionable line synthesizing all three dimensions, so a shopper isn't
 * left to mentally combine three separate badges themselves.
 */
export function summarizeVerdict(verdicts: DimensionVerdict[]): OverallVerdict {
  const withData = verdicts.filter((v) => v.reading !== "no_data");
  if (withData.length === 0) {
    return { headline: "Not enough measurements yet to say how this will fit.", tone: "neutral" };
  }

  const tightDims = withData.filter((v) => v.reading === "tight").map((v) => DIMENSION_LABEL[v.dimension]);
  const looseDims = withData.filter((v) => v.reading === "loose").map((v) => DIMENSION_LABEL[v.dimension]);
  const joinDims = (dims: string[]) =>
    dims.length <= 1 ? dims.join("") : `${dims.slice(0, -1).join(", ")} and ${dims[dims.length - 1]}`;

  if (tightDims.length === 0 && looseDims.length === 0) {
    return { headline: "Looks like a good fit overall.", tone: "good" };
  }
  if (tightDims.length > 0 && looseDims.length > 0) {
    return {
      headline: `Mixed fit — snug through the ${joinDims(tightDims)}, loose through the ${joinDims(looseDims)}.`,
      tone: "warn",
    };
  }
  if (tightDims.length > 0) {
    return { headline: `Will likely run tight through the ${joinDims(tightDims)}.`, tone: "warn" };
  }
  return { headline: `Will likely run loose through the ${joinDims(looseDims)}.`, tone: "warn" };
}

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

export interface HemEstimate {
  label: string;
  detail: string;
}

// Working anthropometric defaults, not lab-grade constants -- shoulder height
// (acromion) averages roughly 0.82 x total standing height, knee height
// roughly 0.30 x height, fairly consistently across sexes for this purpose
// (per RoyMech's anthropometric tables / the commonly-cited Drillis & Contini
// biomechanics ratios). Good enough for a rough "where would this hit me"
// guide -- not precise enough to state as a hard fact.
const SHOULDER_HEIGHT_RATIO = 0.82;
const KNEE_HEIGHT_RATIO = 0.3;

/**
 * Garment length is conventionally stated shoulder-seam-to-hem. Given a
 * person's total height, estimate where that hem lands relative to real
 * body landmarks (ankle/knee/etc) rather than leaving them to guess from a
 * bare number -- explicitly a rough estimate, worded that way throughout.
 */
export function estimateHemPlacement(
  heightIn: number | null | undefined,
  garmentLengthIn: number | null | undefined
): HemEstimate | null {
  if (!heightIn || heightIn <= 0 || !garmentLengthIn || garmentLengthIn <= 0) return null;

  const shoulderToFloor = heightIn * SHOULDER_HEIGHT_RATIO;
  const kneeFromFloor = heightIn * KNEE_HEIGHT_RATIO;
  const hemFromFloor = shoulderToFloor - garmentLengthIn;

  if (hemFromFloor <= -1.5) {
    return {
      label: "longer than floor-length on you",
      detail: `Roughly ${Math.abs(hemFromFloor).toFixed(0)}" of extra length would likely pool or drag on the floor.`,
    };
  }
  if (hemFromFloor <= 1.5) {
    return { label: "floor-length on you", detail: "Would likely just graze or touch the floor." };
  }
  if (hemFromFloor <= kneeFromFloor * 0.4) {
    return { label: "around your ankle", detail: "Would likely hit right around your ankle." };
  }
  if (hemFromFloor <= kneeFromFloor * 0.75) {
    return { label: "mid-calf on you", detail: "Would likely hit somewhere mid-calf." };
  }
  if (hemFromFloor <= kneeFromFloor * 1.15) {
    return { label: "around your knee", detail: "Would likely hit right around your knee." };
  }
  if (hemFromFloor <= kneeFromFloor * 1.6) {
    return { label: "above your knee", detail: "Would likely hit a few inches above your knee." };
  }
  return {
    label: "well above your knee",
    detail: "Would likely hit well above the knee -- a short length on you.",
  };
}
