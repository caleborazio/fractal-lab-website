"use client";

import { useEffect, useState } from "react";
import { summarizeVerdict, READING_LABEL, type DimensionVerdict, type LandingEstimate } from "@/lib/fit";
import type { ExtractionResult } from "@/lib/gemini";
import { Lightbox } from "@/components/Lightbox";

interface SavedCheck {
  id: string;
  brand: string | null;
  garmentType: string;
  actualFit: string | null;
  createdAt: string;
  images: string[] | null;
  verdict: DimensionVerdict[] | null;
  landing: LandingEstimate | null;
  rise: number | null;
  inseam: number | null;
  rawExtraction: ExtractionResult | null;
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
      <p className="rounded-lg border border-line bg-panel px-4 py-6 text-center text-sm text-ink-soft">
        No checks yet — once you check a listing, it&apos;ll show up here so you can come back to
        it later.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {checks.map((check) => {
        const overall = check.verdict && check.verdict.length > 0 ? summarizeVerdict(check.verdict) : null;
        const isOpen = expandedId === check.id;
        const thumb = check.images?.[0];

        return (
          <div key={check.id} className="rounded-lg border border-line bg-panel">
            <button
              onClick={() => setExpandedId(isOpen ? null : check.id)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left"
            >
              {thumb ? (
                <img src={thumb} alt="" className="h-12 w-12 shrink-0 rounded object-cover" />
              ) : (
                <div className="h-12 w-12 shrink-0 rounded bg-bg-alt" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {check.brand ? `${check.brand} — ` : ""}
                  {check.garmentType}
                </p>
                <p className="text-xs text-ink-faint">
                  {new Date(check.createdAt).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                  {check.actualFit && ` · you said: ${check.actualFit}`}
                </p>
              </div>
              {overall && (
                <span
                  className={
                    "shrink-0 whitespace-nowrap rounded-full px-3 py-1 font-mono text-xs " +
                    (overall.tone === "good"
                      ? "bg-good-bg text-good"
                      : overall.tone === "warn"
                      ? "bg-warn-bg text-warn"
                      : "bg-bg-alt text-ink-faint")
                  }
                >
                  {overall.tone === "good" ? "good fit" : overall.tone === "warn" ? "mixed" : "—"}
                </span>
              )}
            </button>

            {isOpen && (
              <div className="border-t border-line px-4 py-4">
                {overall && <p className="mb-3 text-sm font-medium text-ink">{overall.headline}</p>}

                {check.rawExtraction?.summary && (
                  <p className="mb-3 text-sm text-ink-soft">{check.rawExtraction.summary}</p>
                )}

                {check.rawExtraction?.measuredFromPhoto && (
                  <p className="mb-3 text-sm text-warn">
                    ★ Filled in from a photo, not the listing text — worth a glance yourself.
                  </p>
                )}

                {check.verdict && check.verdict.length > 0 && (
                  <div className="mb-3 flex flex-col gap-1.5">
                    {check.verdict.map((v) => (
                      <div key={v.dimension} className="flex items-center justify-between text-sm">
                        <span className="font-mono text-xs uppercase tracking-wide text-ink-faint">
                          {v.dimension}
                        </span>
                        <span className="text-ink-soft">{READING_LABEL[v.reading]}</span>
                      </div>
                    ))}
                    {check.rise != null && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-mono text-xs uppercase tracking-wide text-ink-faint">
                          rise
                        </span>
                        <span className="text-ink-soft">{check.rise}&quot;</span>
                      </div>
                    )}
                  </div>
                )}

                {check.landing && (
                  <div className="mb-3 rounded border border-line bg-bg px-3 py-2.5">
                    <p className="text-sm font-medium text-ink">{check.landing.label}</p>
                    <p className="text-xs text-ink-soft">{check.landing.detail}</p>
                  </div>
                )}

                {check.images && check.images.length > 0 && (
                  <div className="mb-3 flex flex-wrap gap-2">
                    {check.images.map((src, i) => (
                      <img
                        key={i}
                        src={src}
                        alt={`check photo ${i + 1}`}
                        onClick={() => setLightboxSrc(src)}
                        className="h-16 w-16 cursor-zoom-in rounded object-cover"
                      />
                    ))}
                  </div>
                )}

                <div className="mb-3 border-t border-line pt-3">
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
                            className="rounded border border-line-strong px-3 py-1.5 text-sm hover:border-accent hover:text-accent disabled:opacity-50"
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                <div className="flex justify-end border-t border-line pt-3">
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
