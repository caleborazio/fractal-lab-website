"use client";

import { useEffect, useState } from "react";
import { MeasurementGuide } from "@/components/MeasurementGuide";

interface Profile {
  bust: number;
  waist: number;
  hip: number;
  height: number | null;
  inseam: number | null;
  shoulderToInseam: number | null;
}

const EMPTY_DRAFT = { bust: "", waist: "", hip: "", height: "", inseam: "", shoulderToInseam: "" };

export function MeasurementsForm() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((data) => {
        if (data.profile) {
          setProfile(data.profile);
          setDraft({
            bust: String(data.profile.bust),
            waist: String(data.profile.waist),
            hip: String(data.profile.hip),
            height: data.profile.height != null ? String(data.profile.height) : "",
            inseam: data.profile.inseam != null ? String(data.profile.inseam) : "",
            shoulderToInseam:
              data.profile.shoulderToInseam != null ? String(data.profile.shoulderToInseam) : "",
          });
        }
      });
  }, []);

  async function save() {
    const bust = parseFloat(draft.bust);
    const waist = parseFloat(draft.waist);
    const hip = parseFloat(draft.hip);
    const height = draft.height ? parseFloat(draft.height) : null;
    const inseam = draft.inseam ? parseFloat(draft.inseam) : null;
    const shoulderToInseam = draft.shoulderToInseam ? parseFloat(draft.shoulderToInseam) : null;

    if (!bust || !waist || !hip) {
      setError("Bust, waist, and hip are needed to check a fit.");
      return;
    }
    setError(null);
    setSaved(false);

    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bust, waist, hip, height, inseam, shoulderToInseam }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setProfile(data.profile);
      setSaved(true);
    } catch {
      setError("Couldn't save that — try again.");
    }
  }

  function update(field: keyof typeof draft, value: string) {
    setDraft((prev) => ({ ...prev, [field]: value }));
    setSaved(false);
  }

  if (!profile) return <p className="text-ink-soft">Loading…</p>;

  return (
    <div>
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
              value={draft[field]}
              onChange={(e) => update(field, e.target.value)}
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
            value={draft.height}
            onChange={(e) => update("height", e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-mono text-xs uppercase tracking-wide text-ink-faint">
            inseam (inches) — optional, sharpens where pants/skirts/dresses will actually hit you
          </span>
          <input
            type="number"
            inputMode="decimal"
            className="rounded border border-line bg-panel px-3 py-2 text-ink outline-none focus:border-accent"
            value={draft.inseam}
            onChange={(e) => update("inseam", e.target.value)}
          />
          <span className="text-xs text-ink-faint">
            Crotch seam straight down to the floor, no shoes — the same number pants shopping
            usually asks for.
          </span>
        </label>
      </div>

      <details className="mt-6 rounded border border-line bg-panel">
        <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-ink-soft hover:text-ink">
          Additional measurements (optional, for extra precision)
        </summary>
        <div className="flex flex-col gap-1 border-t border-line px-4 py-4">
          <label className="flex flex-col gap-1">
            <span className="font-mono text-xs uppercase tracking-wide text-ink-faint">
              shoulder to inseam (inches)
            </span>
            <input
              type="number"
              inputMode="decimal"
              className="rounded border border-line bg-bg px-3 py-2 text-ink outline-none focus:border-accent"
              value={draft.shoulderToInseam}
              onChange={(e) => update("shoulderToInseam", e.target.value)}
            />
            <span className="text-xs text-ink-faint">
              Top of your shoulder straight down to your crotch. Only useful together with
              inseam above — the two combined replace a population-average estimate with your
              actual proportions, so a dress or coat length reads more precisely on people whose
              torso-to-leg ratio isn&apos;t average. Skip this one if it&apos;s a hassle to
              measure alone — everything still works fine without it.
            </span>
          </label>
        </div>
      </details>

      {error && <p className="mt-3 text-sm text-bad">{error}</p>}
      <div className="mt-4 flex items-center gap-3">
        <button
          onClick={save}
          className="rounded bg-accent px-5 py-2.5 font-medium text-bg hover:bg-accent-strong"
        >
          Save
        </button>
        {saved && <span className="text-sm text-pine">Saved</span>}
      </div>
    </div>
  );
}
