"use client";

import { useEffect, useState } from "react";
import { MeasurementGuide } from "@/components/MeasurementGuide";

interface Profile {
  bust: number;
  waist: number;
  hip: number;
  height: number | null;
}

export function MeasurementsForm() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [draft, setDraft] = useState({ bust: "", waist: "", hip: "", height: "" });
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
          });
        }
      });
  }, []);

  async function save() {
    const bust = parseFloat(draft.bust);
    const waist = parseFloat(draft.waist);
    const hip = parseFloat(draft.hip);
    const height = draft.height ? parseFloat(draft.height) : null;

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
        body: JSON.stringify({ bust, waist, hip, height }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setProfile(data.profile);
      setSaved(true);
    } catch {
      setError("Couldn't save that — try again.");
    }
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
              onChange={(e) => {
                setDraft({ ...draft, [field]: e.target.value });
                setSaved(false);
              }}
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
            onChange={(e) => {
              setDraft({ ...draft, height: e.target.value });
              setSaved(false);
            }}
          />
        </label>
      </div>
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
