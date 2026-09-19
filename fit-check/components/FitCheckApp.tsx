"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  BodyProfile,
  DimensionVerdict,
  MeasurementConvention,
  READING_LABEL,
  computeVerdict,
  estimateHemPlacement,
  summarizeVerdict,
} from "@/lib/fit";
import type { ExtractionResult } from "@/lib/gemini";
import { FREE_CHECKS_PER_MONTH } from "@/lib/plan";
import { MeasurementGuide } from "@/components/MeasurementGuide";
import { Lightbox } from "@/components/Lightbox";

type Step = "loading" | "profile" | "submit" | "extracting" | "result";

interface ImageAttachment {
  base64: string;
  mimeType: string;
  previewUrl: string;
}

interface UsageStatus {
  checksUsed: number;
  checksRemaining: number | null;
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

/** Small JPEG thumbnails for history -- not the full-resolution images sent
 * to Gemini, just enough to recognize the item later without bloating the DB. */
function downscale(dataUrl: string, maxDim = 240, quality = 0.6): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("no canvas context"));
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => reject(new Error("image failed to load"));
    img.src = dataUrl;
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

export function FitCheckApp() {
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
  const [usage, setUsage] = useState<UsageStatus | null>(null);

  const [extraction, setExtraction] = useState<ExtractionResult | null>(null);
  const [usedImages, setUsedImages] = useState<string[]>([]);
  const [warning, setWarning] = useState<string | null>(null);
  const [checkId, setCheckId] = useState<string | null>(null);
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Recomputed live on every edit -- no separate "confirm, then see the
  // verdict" step. Editing a field immediately updates the read below it.
  const verdict = useMemo(
    () => (profile && extraction ? computeVerdict(profile, extraction) : null),
    [profile, extraction]
  );
  const overall = useMemo(() => (verdict ? summarizeVerdict(verdict) : null), [verdict]);
  const hem = useMemo(
    () => estimateHemPlacement(profile?.height, extraction?.length),
    [profile?.height, extraction?.length]
  );

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((data) => {
        if (data.usage) setUsage(data.usage);
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
      if (data.usage) setUsage(data.usage);
      if (!res.ok) {
        setError(
          data.error ?? "Couldn't read that listing. Try a clearer photo of the tag or measurements."
        );
        setStep("submit");
        return;
      }
      const result: ExtractionResult = data.result;
      const usedImageUrls: string[] = (data.usedImages ?? []).map(
        (img: { dataUrl: string }) => img.dataUrl
      );
      setExtraction(result);
      setUsedImages(usedImageUrls);
      setWarning(data.warning ?? null);
      setStep("result");

      // Save right away, before any feedback -- someone often can't say how
      // it actually fit until they've received the item, sometimes weeks
      // later, and the check should already be sitting in their history by
      // then rather than only existing if they happen to answer immediately.
      if (profile) {
        try {
          const thumbnails = await Promise.all(
            usedImageUrls.slice(0, 6).map((src) => downscale(src).catch(() => null))
          );
          const verdictNow = computeVerdict(profile, result);
          const byDimension = Object.fromEntries(verdictNow.map((d) => [d.dimension, d]));
          const saveRes = await fetch("/api/checks", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              brand: result.brand,
              garmentType: result.garmentType,
              bust: byDimension.bust?.garment ?? null,
              waist: byDimension.waist?.garment ?? null,
              hip: byDimension.hip?.garment ?? null,
              length: result.length,
              rawExtraction: result,
              verdict: verdictNow,
              images: thumbnails.filter((t): t is string => !!t),
            }),
          });
          if (saveRes.ok) {
            const saveData = await saveRes.json();
            setCheckId(saveData.check?.id ?? null);
          }
        } catch {
          // History save failing shouldn't block showing the read they came for.
        }
      }
    } catch {
      setError("Couldn't read that listing. Try a clearer photo of the tag or measurements.");
      setStep("submit");
    }
  }

  function updateExtractionField(
    field: "bust" | "waist" | "hip" | "length" | "brand" | "size",
    value: string
  ) {
    if (!extraction) return;
    if (field === "brand" || field === "size") {
      setExtraction({ ...extraction, [field]: value || null });
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

  async function sendFeedback(actualFit: string) {
    if (!checkId) return;
    setSaving(true);
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
    } finally {
      setSaving(false);
    }
  }

  function checkAnother() {
    setImages([]);
    setListingText("");
    setExtraction(null);
    setUsedImages([]);
    setWarning(null);
    setCheckId(null);
    setFeedbackSent(false);
    setError(null);
    setStep("submit");
  }

  return (
    <>
      {step === "loading" && <p className="text-ink-soft">Loading…</p>}

      {step === "profile" && (
        <section>
          <h1 className="mb-2 text-3xl font-semibold">Quick one-time setup</h1>
          <p className="mb-4 max-w-prose text-ink-soft">
            Four numbers, just for you — never shared. This is what every fit-check
            gets compared against.
          </p>

          <MeasurementGuide />

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
                height (inches) — optional, but unlocks a guess at where a hem would hit you
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
              <span className="text-xs text-ink-faint">
                Stand straight, no shoes — the usual way you&apos;d check your height against a wall.
              </span>
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
          <p className="mb-2 max-w-prose text-ink-soft">
            Paste a link from Poshmark or Vinted and it reads the listing directly. For anywhere
            else, upload a photo of the tag, the seller&apos;s measurements, or a flat-lay instead —
            works just as well.
          </p>

          {usage && usage.checksRemaining !== null && (
            <p className="mb-4 text-xs text-ink-faint">
              {usage.checksRemaining} of {FREE_CHECKS_PER_MONTH} free checks left this month
              {usage.checksRemaining === 0 && (
                <>
                  {" "}
                  —{" "}
                  <a href="/app/settings" className="underline hover:text-accent">
                    upgrade in Settings
                  </a>{" "}
                  for unlimited
                </>
              )}
            </p>
          )}

          <label className="mb-1 block font-mono text-xs uppercase tracking-wide text-ink-faint">
            paste the listing text or link
          </label>
          <textarea
            className="mb-4 w-full rounded border border-line bg-panel px-3 py-2 text-ink outline-none focus:border-accent"
            rows={3}
            value={listingText}
            onChange={(e) => setListingText(e.target.value)}
            placeholder="Paste a link, or the seller's description and measurements…"
          />

          <p className="mb-2 text-center text-xs text-ink-faint">or</p>

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
                  onClick={() => setLightboxSrc(img.previewUrl)}
                  className="h-20 w-20 cursor-zoom-in rounded object-cover"
                />
              ))}
            </div>
          )}

          {error && <p className="mb-3 text-sm text-bad">{error}</p>}

          <button
            onClick={checkFit}
            className="rounded bg-accent px-5 py-3 font-medium text-bg hover:bg-accent-strong"
          >
            {error ? "Recheck the fit" : "Check the fit"}
          </button>
        </section>
      )}

      {step === "extracting" && (
        <section className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-lg text-ink-soft">Reading the listing…</p>
        </section>
      )}

      {step === "result" && extraction && verdict && overall && (
        <section>
          <h1 className="mb-3 text-2xl font-semibold">Here&apos;s the read</h1>

          {warning && (
            <p className="mb-4 rounded border border-warn bg-warn-bg px-4 py-3 text-sm text-warn">
              {warning}
            </p>
          )}

          <div
            className={
              "mb-4 rounded border px-4 py-3 text-base font-medium " +
              (overall.tone === "good"
                ? "border-good bg-good-bg text-good"
                : overall.tone === "warn"
                ? "border-warn bg-warn-bg text-warn"
                : "border-line bg-bg-alt text-ink-soft")
            }
          >
            {overall.headline}
          </div>

          {extraction.summary && (
            <p className="mb-4 rounded border border-line bg-panel px-4 py-3 text-sm text-ink-soft">
              {extraction.summary}
            </p>
          )}

          <p className="mb-4 text-sm text-ink-faint">
            Confidence: <strong className="text-ink">{extraction.confidence}</strong>
            {extraction.readFrom && <> — read from &quot;{extraction.readFrom}&quot;</>}
          </p>

          {extraction.fitNotes && (
            <p className="mb-4 text-sm text-ink-soft">
              <span className="font-mono text-xs uppercase tracking-wide text-ink-faint">fit notes: </span>
              {extraction.fitNotes}
            </p>
          )}

          {usedImages.length > 0 && (
            <div className="mb-4">
              <span className="mb-1 block font-mono text-xs uppercase tracking-wide text-ink-faint">
                photos this read used ({usedImages.length})
              </span>
              <div className="flex flex-wrap gap-2">
                {usedImages.map((src, i) => (
                  <img
                    key={i}
                    src={src}
                    alt={`listing photo ${i + 1}`}
                    onClick={() => setLightboxSrc(src)}
                    className="h-16 w-16 cursor-zoom-in rounded object-cover"
                  />
                ))}
              </div>
              <p className="mt-1 text-xs text-ink-faint">tap a photo to look closer</p>
            </div>
          )}

          <div className="mb-6 flex flex-col gap-3">
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
            {extraction.length != null && (
              <p className="mt-2 text-sm text-ink-soft">
                Garment length: <strong className="text-ink">{extraction.length}&quot;</strong>
                {hem ? (
                  <>
                    {" "}
                    — rough guess: <strong className="text-ink">{hem.label}</strong>.{" "}
                    <span className="text-ink-faint">{hem.detail}</span>
                  </>
                ) : (
                  " — worth comparing to where you'd want it to hit. Add your height in your profile for a rough guess at exactly that."
                )}
              </p>
            )}
          </div>

          <details className="mb-6 rounded border border-line bg-panel">
            <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-ink-soft hover:text-ink">
              Doesn&apos;t look right? Edit what was found
            </summary>
            <div className="flex flex-col gap-4 border-t border-line px-4 py-4">
              <div className="flex gap-3">
                <label className="flex flex-1 flex-col gap-1">
                  <span className="font-mono text-xs uppercase tracking-wide text-ink-faint">brand</span>
                  <input
                    className="rounded border border-line bg-bg px-3 py-2"
                    value={extraction.brand ?? ""}
                    onChange={(e) => updateExtractionField("brand", e.target.value)}
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="font-mono text-xs uppercase tracking-wide text-ink-faint">
                    size (as listed)
                  </span>
                  <input
                    className="w-28 rounded border border-line bg-bg px-3 py-2"
                    value={extraction.size ?? ""}
                    placeholder="no data"
                    onChange={(e) => updateExtractionField("size", e.target.value)}
                  />
                </label>
              </div>

              {(["bust", "waist", "hip"] as const).map((field) => (
                <div key={field} className="flex flex-col gap-1">
                  <span className="font-mono text-xs uppercase tracking-wide text-ink-faint">
                    {field} ({extraction.unit})
                  </span>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      inputMode="decimal"
                      className="w-24 rounded border border-line bg-bg px-3 py-2"
                      value={extraction[field] ?? ""}
                      onChange={(e) => updateExtractionField(field, e.target.value)}
                      placeholder="no data"
                    />
                    <select
                      className="flex-1 rounded border border-line bg-bg px-2 py-2 text-sm text-ink-soft"
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
                  className="rounded border border-line bg-bg px-3 py-2"
                  value={extraction.length ?? ""}
                  onChange={(e) => updateExtractionField("length", e.target.value)}
                  placeholder="no data"
                />
              </label>
              <p className="text-xs text-ink-faint">
                Changes here update the read above immediately.
              </p>
            </div>
          </details>

          <div className="rounded border border-line bg-panel px-4 py-4">
            {feedbackSent ? (
              <p className="text-sm text-pine">Thanks — that helps tune future reads.</p>
            ) : checkId ? (
              <>
                <p className="mb-3 text-sm text-ink-soft">
                  Did you get it? How did it actually fit? (No rush — this is saved in your{" "}
                  <a href="/app/history" className="underline hover:text-accent">
                    history
                  </a>{" "}
                  for whenever you know.)
                </p>
                <div className="flex flex-wrap gap-2">
                  {["tight", "perfect", "loose", "didn't buy it"].map((opt) => (
                    <button
                      key={opt}
                      disabled={saving}
                      onClick={() => sendFeedback(opt)}
                      className="rounded border border-line-strong px-3 py-1.5 text-sm hover:border-accent hover:text-accent disabled:opacity-50"
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-sm text-ink-faint">
                This read didn&apos;t save to your history (connection hiccup) — the result above is
                still accurate, just won&apos;t show up later.
              </p>
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

      <Lightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
    </>
  );
}
