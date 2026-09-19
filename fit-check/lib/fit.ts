export type Dimension = "bust" | "waist" | "hip";
export type MeasurementConvention = "circumference" | "flat_half" | "unknown";

export interface BodyProfile {
  bust: number;
  waist: number;
  hip: number;
  height?: number | null;
  /** Crotch-to-floor. Optional, but the single highest-leverage addition for
   * pants-length accuracy -- unlike torso proportions, leg-length-to-height
   * varies enough person to person that a population ratio is noticeably
   * worse than the real number when someone happens to know it. */
  inseam?: number | null;
  /** High-shoulder-point to crotch (torso length). Optional "bonus" field --
   * combined with inseam it gives shoulderToInseam + inseam = actual shoulder
   * height, replacing the SHOULDER_HEIGHT_RATIO population estimate with a
   * personalized one. Provides no benefit on its own without inseam too. */
  shoulderToInseam?: number | null;
}

export interface GarmentMeasurements {
  bust?: number | null;
  bustConvention?: MeasurementConvention | null;
  waist?: number | null;
  waistConvention?: MeasurementConvention | null;
  hip?: number | null;
  hipConvention?: MeasurementConvention | null;
  length?: number | null;
  /** Bottoms only: crotch seam to top of waistband. Informational -- there's
   * no body-side equivalent to compare it against, so it doesn't feed a
   * tight/loose verdict, just gets surfaced as-is. */
  rise?: number | null;
  /** Bottoms only: crotch seam to leg opening. Feeds estimateGarmentLanding
   * the same way `length` does for hemmed garments. */
  inseam?: number | null;
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

export interface LandingEstimate {
  label: string;
  detail: string;
  /** "measured" when this used the person's own inseam/shoulderToInseam
   * rather than a population-average ratio -- lets the UI show someone that
   * filling in Settings actually sharpened the read. */
  precision: "measured" | "estimated";
}

// Working anthropometric defaults, not lab-grade constants. Shoulder height
// (acromion) and knee height are the two this app already shipped with, per
// RoyMech's anthropometric tables / the commonly-cited Drillis & Contini
// biomechanics ratios. CROTCH_HEIGHT_RATIO and KNEE_FRACTION_OF_INSEAM are
// new -- cross-checked against Pheasant & Haslegrave's Bodyspace percentile
// data (RoyMech) and independent stature-ratio sources, which converged in
// the 0.45-0.51 range for crotch/inseam height; 0.47 is a middle estimate.
// All of these are rough, population-average fallbacks used only when the
// person hasn't filled in the real number themselves -- not lab-grade, and
// not precise enough to state as a hard fact.
const SHOULDER_HEIGHT_RATIO = 0.82;
const KNEE_HEIGHT_RATIO = 0.3;
const CROTCH_HEIGHT_RATIO = 0.47;
// Knee position as a fraction of leg length (crotch-to-floor), derived from
// the two ratios above (KNEE_HEIGHT_RATIO / CROTCH_HEIGHT_RATIO) -- lets a
// real inseam sharpen the knee reference too, not just the pants estimate.
const KNEE_FRACTION_OF_INSEAM = 0.64;

export function isPantsLike(garmentType: string): boolean {
  return /pant|jean|trouser|short|legging|capri|jogger/i.test(garmentType);
}

/**
 * Garment length (shoulder-seam-to-hem) or garment inseam (crotch-to-leg-
 * opening), depending on garment type -- estimates where it lands on the
 * person relative to real body landmarks, using their own inseam/
 * shoulderToInseam when available and falling back to population-average
 * ratios from height otherwise. Explicitly a rough estimate either way,
 * worded that way throughout.
 */
export function estimateGarmentLanding(
  garmentType: string,
  body: BodyProfile,
  garment: Pick<GarmentMeasurements, "length" | "inseam">
): LandingEstimate | null {
  return isPantsLike(garmentType)
    ? estimatePantsLanding(body, garment.inseam)
    : estimateHemLanding(body, garment.length);
}

function estimateHemLanding(
  body: BodyProfile,
  garmentLengthIn: number | null | undefined
): LandingEstimate | null {
  if (!garmentLengthIn || garmentLengthIn <= 0) return null;

  let shoulderToFloor: number;
  let precision: "measured" | "estimated" = "estimated";
  if (body.shoulderToInseam && body.inseam) {
    shoulderToFloor = body.shoulderToInseam + body.inseam;
    precision = "measured";
  } else if (body.height) {
    shoulderToFloor = body.height * SHOULDER_HEIGHT_RATIO;
  } else {
    return null;
  }

  let kneeFromFloor: number;
  if (body.inseam) {
    kneeFromFloor = body.inseam * KNEE_FRACTION_OF_INSEAM;
    precision = "measured";
  } else if (body.height) {
    kneeFromFloor = body.height * KNEE_HEIGHT_RATIO;
  } else {
    kneeFromFloor = shoulderToFloor * (KNEE_HEIGHT_RATIO / SHOULDER_HEIGHT_RATIO);
  }

  const hemFromFloor = shoulderToFloor - garmentLengthIn;

  if (hemFromFloor <= -1.5) {
    return {
      label: "longer than floor-length on you",
      detail: `Roughly ${Math.abs(hemFromFloor).toFixed(0)}" of extra length would likely pool or drag on the floor.`,
      precision,
    };
  }
  if (hemFromFloor <= 1.5) {
    return { label: "floor-length (maxi) on you", detail: "Would likely just graze or touch the floor.", precision };
  }
  if (hemFromFloor <= kneeFromFloor * 0.4) {
    return { label: "tea-length on you", detail: "Would likely hit right around your ankle.", precision };
  }
  if (hemFromFloor <= kneeFromFloor * 0.75) {
    return { label: "midi-length on you", detail: "Would likely hit somewhere mid-calf.", precision };
  }
  if (hemFromFloor <= kneeFromFloor * 1.15) {
    return { label: "knee-length on you", detail: "Would likely hit right around your knee.", precision };
  }
  if (hemFromFloor <= kneeFromFloor * 1.6) {
    return { label: "above-the-knee on you", detail: "Would likely hit a few inches above your knee.", precision };
  }
  return {
    label: "mini-length on you",
    detail: "Would likely hit well above the knee -- a short length on you.",
    precision,
  };
}

/**
 * Ease bands here are rougher than the hem ones above -- there's no
 * standardized "cropped vs. full-length" naming the way dress lengths have
 * mini/midi/maxi, so these are this app's own first-pass thresholds on the
 * difference between garment inseam and the person's inseam. Same as the
 * ease bands in readingForEase: tune from real feedback once it exists.
 */
function estimatePantsLanding(
  body: BodyProfile,
  garmentInseamIn: number | null | undefined
): LandingEstimate | null {
  if (!garmentInseamIn || garmentInseamIn <= 0) return null;

  let personInseam: number;
  let precision: "measured" | "estimated";
  if (body.inseam) {
    personInseam = body.inseam;
    precision = "measured";
  } else if (body.height) {
    personInseam = body.height * CROTCH_HEIGHT_RATIO;
    precision = "estimated";
  } else {
    return null;
  }

  const diff = garmentInseamIn - personInseam; // + = extra length (pools), - = short (crops)

  if (diff >= 1.5) {
    return {
      label: "longer than full-length on you",
      detail: `Roughly ${diff.toFixed(0)}" of extra length would likely pool or bunch at the ankle.`,
      precision,
    };
  }
  if (diff >= -0.75) {
    return { label: "full-length on you", detail: "Would likely land right at your ankle.", precision };
  }
  if (diff >= -3) {
    return {
      label: "ankle-length (cropped) on you",
      detail: `Roughly ${Math.abs(diff).toFixed(0)}" short -- would likely hit above your ankle.`,
      precision,
    };
  }
  if (diff >= -6) {
    return {
      label: "cropped on you",
      detail: `Roughly ${Math.abs(diff).toFixed(0)}" short -- would likely hit around mid-calf.`,
      precision,
    };
  }
  return {
    label: "shorts-length on you",
    detail: `Roughly ${Math.abs(diff).toFixed(0)}" short -- would likely hit at or above the knee.`,
    precision,
  };
}
