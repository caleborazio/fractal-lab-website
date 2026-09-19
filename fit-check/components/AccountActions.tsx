"use client";

import { useState } from "react";
import { PLUS_PRICE_LABEL } from "@/lib/plan";

export function AccountActions({ plan }: { plan: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function go(path: "/api/checkout" | "/api/billing-portal") {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(path, { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error ?? "Couldn't reach billing.");
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't reach billing.");
      setBusy(false);
    }
  }

  return (
    <div className="mt-2">
      {plan === "paid" ? (
        <button
          onClick={() => go("/api/billing-portal")}
          disabled={busy}
          className="text-xs text-ink-faint underline hover:text-accent disabled:opacity-50"
        >
          Manage billing
        </button>
      ) : (
        <button
          onClick={() => go("/api/checkout")}
          disabled={busy}
          className="rounded bg-accent px-3 py-1.5 text-xs font-medium text-bg hover:bg-accent-strong disabled:opacity-50"
        >
          Upgrade to Plus ({PLUS_PRICE_LABEL}/mo)
        </button>
      )}
      {error && <p className="mt-2 text-xs text-bad">{error}</p>}
    </div>
  );
}
