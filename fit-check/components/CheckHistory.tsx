"use client";

import { useEffect, useState } from "react";
import { summarizeVerdict, isPantsLike, type DimensionVerdict, type LandingEstimate } from "@/lib/fit";
import type { ExtractionResult } from "@/lib/gemini";
import { Lightbox } from "@/components/Lightbox";
import { FitTag, LandingNote, ListedMeasurement } from "@/components/FitTag";

const SITE_NAMES: [RegExp, string][] = [
  [/poshmark|posh\.mk/, "Poshmark"],
  [/depop/, "Depop"],
  [/thredup/, "ThredUp"],
  [/vinted/, "Vinted"],
  [/ebay/, "eBay"],
  [/therealreal/, "The RealReal"],
  [/etsy/, "Etsy"],
  [/grailed/, "Grailed"],
];

function siteName(url: string | null): string | null {
  if (!url) return null;
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return SITE_NAMES.find(([pattern]) => pattern.test(host))?.[1] ?? host;
  } catch {
    return null;
  }
}

interface SavedCheck {
  id: string;
  brand: string | null;
  garmentType: string;
  actualFit: string | null;
  createdAt: string;
  images: string[] | null;
  verdict: DimensionVerdict[] | null;
  landing: LandingEstimate | null;
  length: number | null;
  rise: number | null;
  inseam: number | null;
  rawExtraction: ExtractionResult | null;
  sourceUrl: string | null;
}

export function CheckHistory() {
  const [checks, setChecks] = useState<SavedCheck[] | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/checks")
      .then((r) => r.json())
      .then((data) => setChecks(data.checks ?? []))
      .catch(() => setChecks([]));
  }, []);

  // The whole point of saving before feedback exists -- someone often can't
  // say how it fit until the item actually arrives, sometimes weeks later,
  // so this needs to be answerable from history, not just right after a check.
  async function sendFeedback(id: string, actualFit: string) {
    setSubmittingId(id);
    try {
      const res = await fetch(`/api/checks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actualFit }),
      });
      if (!res.ok) throw new Error();
      setChecks((prev) =>
        prev ? prev.map((c) => (c.id === id ? { ...c, actualFit } : c)) : prev
      );
    } catch {
      // Leave the buttons up so they can just try again.
    } finally {
      setSubmittingId(null);
    }
  }

  async function deleteCheck(id: string) {
    setSubmittingId(id);
    try {
      const res = await fetch(`/api/checks/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setChecks((prev) => (prev ? prev.filter((c) => c.id !== id) : prev));
    } catch {
      // Leave it in the list so they can try again.
    } finally {
      setSubmittingId(null);
      setConfirmDeleteId(null);
    }
  }

  if (checks === null) return <p className="text-ink-soft">Loading…</p>;

  if (checks.length === 0) {
    return (
      <p className="paper-grid border border-line px-4 py-8 text-center text-ink-soft">
        No checks yet — once you check a listing, it’ll show up here so you can come back to
        it later.
      </p>
    );
  }

  return (
    <div className="flex flex-col">
      {checks.map((check) => {
        const overall = check.verdict && check.verdict.length > 0 ? summarizeVerdict(check.verdict) : null;
        const isOpen = expandedId === check.id;
        const thumb = check.images?.[0];
        const label = [check.brand, siteName(check.sourceUrl)].filter(Boolean).join(" · ");
        const toneText =
          overall?.tone === "good" ? "text-good" : overall?.tone === "warn" ? "text-warn" : "text-ink-faint";

        return (
          <div key={check.id} className="border-t border-line last:border-b">
            <button
              onClick={() => setExpandedId(isOpen ? null : check.id)}
              aria-expanded={isOpen}
              className="flex w-full items-start gap-4 py-4 text-left"
            >
              {thumb ? (
                <img src={thumb} alt="" className="h-24 w-[76px] shrink-0 object-cover" />
              ) : (
                <div className="paper-grid h-24 w-[76px] shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                {label && (
                  <p className="truncate font-mono text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
                    {label}
                  </p>
                )}
                <p className="truncate text-lg capitalize">{check.garmentType}</p>
                {overall && <p className={`italic ${toneText}`}>{overall.headline.replace(/\.$/, "")}</p>}
                <p className="text-sm text-ink-faint">
                  {new Date(check.createdAt).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                  {check.actualFit && ` · you said: ${check.actualFit}`}
                </p>
              </div>
            </button>

            {isOpen && (
              <div className="flex flex-col gap-4 pb-6">
                {check.verdict && check.verdict.length > 0 && overall && (
                  <FitTag
                    title={[check.brand, check.garmentType].filter(Boolean).join(" · ")}
                    verdict={check.verdict}
                    overall={overall}
                  >
                    <ListedMeasurement label="Length" value={check.length} />
                    <ListedMeasurement label="Inseam" value={check.inseam} />
                    <ListedMeasurement label="Rise" value={isPantsLike(check.garmentType) ? check.rise : null} />
                  </FitTag>
                )}

                {check.landing && <LandingNote landing={check.landing} />}

                {check.rawExtraction?.summary && (
                  <p className="text-sm text-ink-soft">{check.rawExtraction.summary}</p>
                )}

                {check.rawExtraction?.measuredFromPhoto && (
                  <p className="text-sm text-warn">
                    ★ Filled in from a photo, not the listing text — worth a glance yourself.
                  </p>
                )}

                {check.images && check.images.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {check.images.map((src, i) => (
                      <img
                        key={i}
                        src={src}
                        alt={`check photo ${i + 1}`}
                        onClick={() => setLightboxSrc(src)}
                        className="h-20 w-16 cursor-zoom-in object-cover"
                      />
                    ))}
                  </div>
                )}

                <div className="border-t border-line pt-4">
                  {check.actualFit ? (
                    <p className="text-sm text-ink-faint">
                      You said: <span className="text-ink-soft">{check.actualFit}</span>
                    </p>
                  ) : (
                    <>
                      <p className="mb-2 text-sm text-ink-soft">Know how it fit yet?</p>
                      <div className="flex flex-wrap gap-2">
                        {["tight", "perfect", "loose", "didn't buy it"].map((opt) => (
                          <button
                            key={opt}
                            disabled={submittingId === check.id}
                            onClick={() => sendFeedback(check.id, opt)}
                            className="border border-line-strong px-3 py-1.5 text-sm hover:border-ink disabled:opacity-50"
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                <div className="flex justify-end">
                  {confirmDeleteId === check.id ? (
                    <button
                      disabled={submittingId === check.id}
                      onClick={() => deleteCheck(check.id)}
                      className="text-xs text-bad underline disabled:opacity-50"
                    >
                      Click again to permanently delete
                    </button>
                  ) : (
                    <button
                      onClick={() => setConfirmDeleteId(check.id)}
                      className="text-xs text-ink-faint underline hover:text-bad"
                    >
                      Delete this check
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}

      <Lightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
    </div>
  );
}
