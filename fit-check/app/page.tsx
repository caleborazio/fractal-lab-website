"use client";

import { useEffect, useRef, useState } from "react";
import {
  BodyProfile,
  DimensionVerdict,
  MeasurementConvention,
  READING_LABEL,
  computeVerdict,
} from "@/lib/fit";
import type { ExtractionResult } from "@/lib/gemini";

type Step = "loading" | "profile" | "submit" | "extracting" | "confirm" | "verdict";

interface ImageAttachment {
  base64: string;
  mimeType: string;
  previewUrl: string;
}

function fileToAttachment(file: File): Promise<ImageAttachment> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(",")[1];
      resolve({ base64, mimeType: file.type, previewUrl: dataUrl });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function readingTone(reading: DimensionVerdict["reading"]) {
  if (reading === "fitted" || reading === "comfortable") return "good";
  if (reading === "no_data") return "neutral";
  return "warn";
}

const CONVENTION_LABEL: Record<MeasurementConvention, string> = {
  circumference: "stated as full circumference",
  flat_half: "flat/half — doubled for comparison",
  unknown: "convention unclear",
};

export default function Home() {
  const [step, setStep] = useState<Step>("loading");
  const [profile, setProfile] = useState<BodyProfile | null>(null);
  const [profileDraft, setProfileDraft] = useState({
    bust: "",
    waist: "",
    hip: "",
    height: "",
  });

  const [images, setImages] = useState<ImageAttachment[]>([]);
  const [listingText, setListingText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [extraction, setExtraction] = useState<ExtractionResult | null>(null);
  const [verdict, setVerdict] = useState<DimensionVerdict[] | null>(null);
  const [checkId, setCheckId] = useState<string | null>(null);
  const [feedbackSent, setFeedbackSent] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((data) => {
        if (data.profile) {
          setProfile(data.profile);
          setStep("submit");
        } else {
          setStep("profile");
        }
      })
      .catch(() => setStep("profile"));
  }, []);

  async function saveProfile() {
    const bust = parseFloat(profileDraft.bust);
    const waist = parseFloat(profileDraft.waist);
    const hip = parseFloat(profileDraft.hip);
    const height = profileDraft.height ? parseFloat(profileDraft.height) : null;

    if (!bust || !waist || !hip) {
      setError("Bust, waist, and hip are needed to check a fit.");
      return;
    }
    setError(null);

    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bust, waist, hip, height }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setProfile(data.profile);
      setStep("submit");
    } catch {
      setError("Couldn't save that — check the database is connected and try again.");
    }
  }

  async function handleFiles(fileList: FileList | null) {
    if (!fileList) return;
    const files = Array.from(fileList).slice(0, 10);
    const attachments = await Promise.all(files.map(fileToAttachment));
    setImages((prev) => [...prev, ...attachments].slice(0, 10));
  }

  async function checkFit() {
    if (images.length === 0 && !listingText.trim()) {
      setError("Add a photo or paste some listing text first.");
      return;
    }
    setError(null);
    setStep("extracting");

    try {
      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          images: images.map(({ base64, mimeType }) => ({ base64, mimeType })),
          listingText: listingText.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Extraction failed");
      setExtraction(data.result);
      setStep("confirm");
    } catch {
      setError("Couldn't read that listing. Try a clearer photo of the tag or measurements.");
      setStep("submit");
    }
  }

  function updateExtractionField(
    field: "bust" | "waist" | "hip" | "length" | "brand",
    value: string
  ) {
    if (!extraction) return;
    if (field === "brand") {
      setExtraction({ ...extraction, brand: value || null });
      return;
    }
    const num = value === "" ? null : parseFloat(value);
    setExtraction({ ...extraction, [field]: num });
  }

  function updateConvention(
    field: "bustConvention" | "waistConvention" | "hipConvention",
    value: string
  ) {
    if (!extraction) return;
    setExtraction({ ...extraction, [field]: value as MeasurementConvention });
  }

  async function confirmAndSeeVerdict() {
    if (!profile || !extraction) return;
    const v = computeVerdict(profile, extraction);
    setVerdict(v);
    // The verdict itself never depends on persistence succeeding -- show it either way.
    setStep("verdict");

    try {
      const byDimension = Object.fromEntries(v.map((d) => [d.dimension, d]));
      const res = await fetch("/api/checks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brand: extraction.brand,
          garmentType: extraction.garmentType,
          // Store the resolved circumference-equivalent, not the raw stated
          // number, so bust/waist/hip are directly comparable across records later.
          bust: byDimension.bust?.garment ?? null,
          waist: byDimension.waist?.garment ?? null,
          hip: byDimension.hip?.garment ?? null,
          length: extraction.length,
          rawExtraction: extraction,
          verdict: v,
        }),
      });
      if (!res.ok) return;
      const data = await res.json();
      setCheckId(data.check?.id ?? null);
    } catch {
      // Non-fatal: the user already has their verdict, we just couldn't save it for the feedback loop.
    }
  }

  async function sendFeedback(actualFit: string) {
    if (!checkId) return;
    try {
      const res = await fetch(`/api/checks/${checkId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actualFit }),
      });
      if (!res.ok) throw new Error();
      setFeedbackSent(true);
    } catch {
      setError("Couldn't save that feedback, but thanks for checking anyway.");
    }
  }

  function checkAnother() {
    setImages([]);
    setListingText("");
    setExtraction(null);
    setVerdict(null);
    setCheckId(null);
    setFeedbackSent(false);
    setError(null);
    setStep("submit");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col px-5 py-8">
      <header className="mb-8 flex items-center justify-between">
        <a
          href="https://fractallab.co"
          className="font-mono text-xs uppercase tracking-wider text-ink-faint hover:text-accent"
        >
          Fractal Lab
        </a>
        <span className="font-mono text-xs uppercase tracking-wider text-pine">
          Fit Check · beta
        </span>
      </header>

      {step === "loading" && (
        <p className="text-ink-soft">Loading…</p>
      )}

      {step === "profile" && (
        <section>
          <h1 className="mb-2 text-3xl font-semibold">Quick one-time setup</h1>
          <p className="mb-6 max-w-prose text-ink-soft">
            Four numbers, just for you — never shared. This is what every fit-check
            gets compared against.
          </p>
          <div className="flex flex-col gap-4">
            {(["bust", "waist", "hip"] as const).map((field) => (
              <label key={field} className="flex flex-col gap-1">
                <span className="font-mono text-xs uppercase tracking-wide text-ink-faint">
                  {field} (inches)
                </span>
                <input
                  type="number"
                  inputMode="decimal"
                  className="rounded border border-line bg-panel px-3 py-2 text-ink outline-none focus:border-accent"
                  value={profileDraft[field]}
                  onChange={(e) =>
                    setProfileDraft({ ...profileDraft, [field]: e.target.value })
                  }
                />
              </label>
            ))}
            <label className="flex flex-col gap-1">
              <span className="font-mono text-xs uppercase tracking-wide text-ink-faint">
                height (inches) — optional
              </span>
              <input
                type="number"
                inputMode="decimal"
                className="rounded border border-line bg-panel px-3 py-2 text-ink outline-none focus:border-accent"
                value={profileDraft.height}
                onChange={(e) =>
                  setProfileDraft({ ...profileDraft, height: e.target.value })
                }
              />
            </label>
          </div>
          {error && <p className="mt-3 text-sm text-bad">{error}</p>}
          <button
            onClick={saveProfile}
            className="mt-6 rounded bg-accent px-5 py-3 font-medium text-bg hover:bg-accent-strong"
          >
            Save & continue
          </button>
        </section>
      )}

      {step === "submit" && (
        <section>
          <h1 className="mb-2 text-3xl font-semibold">Got a listing you&apos;re unsure about?</h1>
          <p className="mb-6 max-w-prose text-ink-soft">
            Screenshot it, or upload a photo of the tag or the seller&apos;s measurements —
            from anywhere: Depop, Poshmark, eBay, a vintage seller&apos;s Instagram.
          </p>

          <div
            onClick={() => fileInputRef.current?.click()}
            className="mb-4 cursor-pointer rounded-lg border-2 border-dashed border-line-strong bg-panel p-8 text-center hover:border-accent"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(e) => handleFiles(e.target.files)}
            />
            <p className="font-medium">Drop or tap to upload up to 10 photos</p>
            <p className="text-sm text-ink-faint">tag, measurements card, or flat-lay</p>
          </div>

          {images.length > 0 && (
            <div className="mb-4 flex gap-2">
              {images.map((img, i) => (
                <img
                  key={i}
                  src={img.previewUrl}
                  alt="upload preview"
                  className="h-20 w-20 rounded object-cover"
                />
              ))}
            </div>
          )}

          <label className="mb-1 block font-mono text-xs uppercase tracking-wide text-ink-faint">
            or paste the listing text / link
          </label>
          <textarea
            className="mb-4 w-full rounded border border-line bg-panel px-3 py-2 text-ink outline-none focus:border-accent"
            rows={3}
            value={listingText}
            onChange={(e) => setListingText(e.target.value)}
            placeholder="Paste a link, or the seller's description and measurements…"
          />

          {error && <p className="mb-3 text-sm text-bad">{error}</p>}

          <button
            onClick={checkFit}
            className="rounded bg-accent px-5 py-3 font-medium text-bg hover:bg-accent-strong"
          >
            Check the fit
          </button>

          <button
            onClick={() => setStep("profile")}
            className="ml-3 text-sm text-ink-faint underline hover:text-accent"
          >
            edit your measurements
          </button>
        </section>
      )}

      {step === "extracting" && (
        <section className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-lg text-ink-soft">Reading the listing…</p>
        </section>
      )}

      {step === "confirm" && extraction && (
        <section>
          <h1 className="mb-2 text-2xl font-semibold">Does this look right?</h1>

          {extraction.summary && (
            <p className="mb-4 rounded border border-line bg-panel px-4 py-3 text-sm text-ink-soft">
              {extraction.summary}
            </p>
          )}

          <p className="mb-4 text-sm text-ink-faint">
            Confidence: <strong className="text-ink">{extraction.confidence}</strong>
            {extraction.readFrom && <> — read from &quot;{extraction.readFrom}&quot;</>}
          </p>

          <div className="flex flex-col gap-4">
            <label className="flex flex-col gap-1">
              <span className="font-mono text-xs uppercase tracking-wide text-ink-faint">brand</span>
              <input
                className="rounded border border-line bg-panel px-3 py-2"
                value={extraction.brand ?? ""}
                onChange={(e) => updateExtractionField("brand", e.target.value)}
              />
            </label>

            {(["bust", "waist", "hip"] as const).map((field) => (
              <div key={field} className="flex flex-col gap-1">
                <span className="font-mono text-xs uppercase tracking-wide text-ink-faint">
                  {field} ({extraction.unit})
                </span>
                <div className="flex gap-2">
                  <input
                    type="number"
                    inputMode="decimal"
                    className="w-24 rounded border border-line bg-panel px-3 py-2"
                    value={extraction[field] ?? ""}
                    onChange={(e) => updateExtractionField(field, e.target.value)}
                    placeholder="no data"
                  />
                  <select
                    className="flex-1 rounded border border-line bg-panel px-2 py-2 text-sm text-ink-soft"
                    value={extraction[`${field}Convention`] ?? "unknown"}
                    onChange={(e) =>
                      updateConvention(`${field}Convention` as const, e.target.value)
                    }
                  >
                    <option value="circumference">full circumference (all the way around)</option>
                    <option value="flat_half">flat / half (e.g. pit-to-pit)</option>
                    <option value="unknown">not sure</option>
                  </select>
                </div>
              </div>
            ))}

            <label className="flex flex-col gap-1">
              <span className="font-mono text-xs uppercase tracking-wide text-ink-faint">
                length ({extraction.unit})
              </span>
              <input
                type="number"
                inputMode="decimal"
                className="rounded border border-line bg-panel px-3 py-2"
                value={extraction.length ?? ""}
                onChange={(e) => updateExtractionField("length", e.target.value)}
                placeholder="no data"
              />
            </label>
          </div>

          <button
            onClick={confirmAndSeeVerdict}
            className="mt-6 rounded bg-accent px-5 py-3 font-medium text-bg hover:bg-accent-strong"
          >
            Looks right — check the fit
          </button>
        </section>
      )}

      {step === "verdict" && verdict && (
        <section>
          <h1 className="mb-2 text-2xl font-semibold">Here&apos;s the read</h1>

          {extraction?.summary && (
            <p className="mb-6 rounded border border-line bg-panel px-4 py-3 text-sm text-ink-soft">
              {extraction.summary}
            </p>
          )}

          <div className="flex flex-col gap-3">
            {verdict.map((v) => {
              const tone = readingTone(v.reading);
              return (
                <div
                  key={v.dimension}
                  className="flex items-center justify-between gap-3 rounded border border-line bg-panel px-4 py-3"
                >
                  <div>
                    <span className="font-mono text-sm uppercase tracking-wide text-ink-faint">
                      {v.dimension}
                    </span>
                    {v.raw != null && v.convention && (
                      <p className="text-xs text-ink-faint">
                        stated {v.raw}&quot; — {CONVENTION_LABEL[v.convention]}
                        {v.convention === "flat_half" && ` (→ ${v.garment}")`}
                      </p>
                    )}
                  </div>
                  <span
                    className={
                      "whitespace-nowrap rounded-full px-3 py-1 font-mono text-xs " +
                      (tone === "good"
                        ? "bg-good-bg text-good"
                        : tone === "warn"
                        ? "bg-warn-bg text-warn"
                        : "bg-bg-alt text-ink-faint")
                    }
                  >
                    {READING_LABEL[v.reading]}
                    {v.ease != null && ` (${v.ease > 0 ? "+" : ""}${v.ease.toFixed(1)}")`}
                  </span>
                </div>
              );
            })}
            {extraction?.length != null && (
              <p className="mt-2 text-sm text-ink-soft">
                Garment length: <strong className="text-ink">{extraction.length}&quot;</strong> — worth
                comparing to where you&apos;d want it to hit.
              </p>
            )}
          </div>

          <div className="mt-8 rounded border border-line bg-panel px-4 py-4">
            {feedbackSent ? (
              <p className="text-sm text-pine">Thanks — that helps tune future reads.</p>
            ) : (
              <>
                <p className="mb-3 text-sm text-ink-soft">Did you get it? How did it actually fit?</p>
                <div className="flex flex-wrap gap-2">
                  {["tight", "perfect", "loose", "didn't buy it"].map((opt) => (
                    <button
                      key={opt}
                      onClick={() => sendFeedback(opt)}
                      className="rounded border border-line-strong px-3 py-1.5 text-sm hover:border-accent hover:text-accent"
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </>
            )}
            {error && <p className="mt-3 text-sm text-bad">{error}</p>}
          </div>

          <button
            onClick={checkAnother}
            className="mt-6 rounded bg-accent px-5 py-3 font-medium text-bg hover:bg-accent-strong"
          >
            Check another listing
          </button>
        </section>
      )}
    </main>
  );
}
