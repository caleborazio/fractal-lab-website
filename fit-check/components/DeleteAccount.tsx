"use client";

import { useState } from "react";

// Two clicks, like deleting a check in history -- but this one can't be undone
// and takes everything with it, so the second step says so plainly.
export function DeleteAccount() {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/account", { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Couldn't delete your account. Try again.");
      // The sign-in is gone too, so the old session no longer works.
      window.location.href = "/";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't delete your account. Try again.");
      setBusy(false);
    }
  }

  return (
    <div>
      {confirming ? (
        <div className="flex flex-col gap-3 border border-bad px-5 py-4">
          <p className="text-sm text-ink-soft">
            This permanently deletes your measurements, your whole history, every connected app and
            extension, and your sign-in, and cancels any subscription. It can’t be undone.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={remove}
              disabled={busy}
              className="bg-bad px-4 py-2 text-sm text-bg disabled:opacity-50"
            >
              {busy ? "Deleting…" : "Delete my account"}
            </button>
            <button
              onClick={() => setConfirming(false)}
              disabled={busy}
              className="border border-line-strong px-4 py-2 text-sm hover:border-ink disabled:opacity-50"
            >
              Keep it
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => setConfirming(true)} className="text-sm text-bad underline">
          Delete account
        </button>
      )}
      {error && <p className="mt-2 text-sm text-bad">{error}</p>}
    </div>
  );
}
