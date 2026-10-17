import type { ReactNode } from "react";
import {
  READING_LABEL,
  type DimensionVerdict,
  type FitReading,
  type LandingEstimate,
  type MeasurementConvention,
  type OverallVerdict,
} from "@/lib/fit";

// A fit result drawn like a sewing-pattern tag: cut-line border, a stamp, and
// for each dimension the garment's measurement (solid line) against yours
// (dashed), so the room -- or the lack of it -- is visible at a glance.

const READING_TONE: Record<FitReading, "good" | "warn" | "neutral"> = {
  tight: "warn",
  fitted: "good",
  comfortable: "good",
  loose: "warn",
  no_data: "neutral",
};

const TONE_TEXT = { good: "text-good", warn: "text-warn", neutral: "text-ink-faint" } as const;
const TONE_BORDER = { good: "border-good", warn: "border-warn" } as const;

const CONVENTION_NOTE: Record<MeasurementConvention, string> = {
  circumference: "stated all the way around",
  flat_half: "stated flat — doubled",
  unknown: "unclear how it was measured",
};

function inches(n: number): string {
  return Number.isInteger(n) ? `${n}″` : `${n.toFixed(1)}″`;
}

function stampFor(verdict: DimensionVerdict[], overall: OverallVerdict) {
  if (overall.tone === "neutral") return null;
  if (overall.tone === "good") return { label: "Good fit", tone: "good" as const };
  const tight = verdict.some((v) => v.reading === "tight");
  const loose = verdict.some((v) => v.reading === "loose");
  return { label: tight && loose ? "Mixed fit" : tight ? "Runs snug" : "Runs loose", tone: "warn" as const };
}

function Bars({ garment, body }: { garment: number; body: number }) {
  // Both lines start from a few inches below the smaller number, so a 2″
  // difference shows up instead of being a sliver of a 36″ line. The exact
  // numbers are printed right underneath.
  const base = Math.max(0, Math.min(garment, body) - 6);
  const span = Math.max(garment, body) - base;
  const g = ((garment - base) / span) * 100;
  const b = ((body - base) / span) * 100;
  return (
    <div className="relative my-1.5 h-4" aria-hidden="true">
      <div className="absolute left-0 top-[3px] h-[1.5px] bg-ink" style={{ width: `${g}%` }} />
      <div className="absolute top-0 h-[8px] w-px bg-ink" style={{ left: `calc(${g}% - 1px)` }} />
      <div className="absolute left-0 top-[11px] border-t border-dashed border-graphite" style={{ width: `${b}%` }} />
      <div className="absolute top-[8px] h-[7px] w-px bg-graphite" style={{ left: `calc(${b}% - 1px)` }} />
    </div>
  );
}

export function FitTag({
  title,
  verdict,
  overall,
  children,
}: {
  /** Brand and garment, e.g. "Reformation · wrap dress". */
  title: string;
  verdict: DimensionVerdict[];
  overall: OverallVerdict;
  /** Extra rows inside the tag (rise, notes). */
  children?: ReactNode;
}) {
  const stamp = stampFor(verdict, overall);
  return (
    <section className="border border-dashed border-ink/60 bg-bg px-5 py-5">
      {stamp && (
        <div
          className={`float-right -mr-1 -mt-1 mb-2 ml-3 flex h-[72px] w-[72px] -rotate-[10deg] items-center justify-center rounded-full border-2 ${TONE_BORDER[stamp.tone]}`}
        >
          <div
            className={`flex h-[62px] w-[62px] items-center justify-center rounded-full border text-center font-mono text-[10px] font-semibold uppercase leading-tight tracking-wide ${TONE_BORDER[stamp.tone]} ${TONE_TEXT[stamp.tone]}`}
          >
            {stamp.label}
          </div>
        </div>
      )}

      <p className="font-mono text-xs uppercase tracking-wide text-ink-faint">{title}</p>
      <h2 className="mt-1 text-3xl">{overall.headline}</h2>

      <div className="clear-both mt-5 flex flex-col gap-4">
        {verdict.map((v) => {
          const tone = READING_TONE[v.reading];
          return (
            <div key={v.dimension}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-mono text-xs font-semibold uppercase tracking-wide">{v.dimension}</span>
                <span className={`text-right italic ${TONE_TEXT[tone]}`}>{READING_LABEL[v.reading]}</span>
              </div>
              {v.garment != null && <Bars garment={v.garment} body={v.body} />}
              <p className="text-sm text-ink-soft">
                {v.garment != null ? (
                  <>
                    {inches(v.garment)} garment · your {inches(v.body)} ·{" "}
                    {v.ease != null && v.ease >= 0 ? `${inches(v.ease)} of room` : `${inches(Math.abs(v.ease ?? 0))} short`}
                  </>
                ) : (
                  <>No measurement given · your {inches(v.body)}</>
                )}
              </p>
              {v.raw != null && v.convention && v.convention !== "circumference" && (
                <p className="text-xs text-ink-faint">
                  {inches(v.raw)} {CONVENTION_NOTE[v.convention]}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {children}

      {verdict.some((v) => v.garment != null) && (
        <div className="mt-5 flex gap-5 font-mono text-[11px] uppercase tracking-wide text-ink-faint">
          <span className="flex items-center gap-2">
            <span className="inline-block h-[1.5px] w-6 bg-ink" />
            garment
          </span>
          <span className="flex items-center gap-2">
            <span className="inline-block w-6 border-t border-dashed border-graphite" />
            you
          </span>
        </div>
      )}
    </section>
  );
}

export function LandingNote({ landing }: { landing: LandingEstimate }) {
  return (
    <div className="paper-grid border border-line px-5 py-4">
      <p className="font-mono text-xs uppercase tracking-wide text-ink-faint">Where it lands</p>
      <p className="mt-1 font-display text-2xl">{landing.label}</p>
      <p className="text-sm text-ink-soft">{landing.detail}</p>
      <p className="mt-1 font-hand text-lg text-ink-faint">
        {landing.precision === "measured" ? "from your own measurements" : "a rough guess from your height"}
      </p>
    </div>
  );
}
