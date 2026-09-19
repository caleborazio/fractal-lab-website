"use client";

import { useEffect, useState } from "react";

export function ExtensionConnect() {
  const [connected, setConnected] = useState<boolean | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/extension/token")
      .then((r) => r.json())
      .then((data) => setConnected(!!data.connected))
      .catch(() => setConnected(false));
  }, []);

  async function generate() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/extension/token", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.token) throw new Error(data.error ?? "Couldn't generate a code.");
      setToken(data.token);
      setConnected(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't generate a code.");
    } finally {
      setBusy(false);
    }
  }

  async function disconnect() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/extension/token", { method: "DELETE" });
      if (!res.ok) throw new Error();
      setConnected(false);
      setToken(null);
    } catch {
      setError("Couldn't disconnect. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    if (!token) return;
    try {
      await navigator.clipboard.writeText(token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard permission denied -- the code is still selectable on screen.
    }
  }

  return (
    <div className="rounded-lg border border-line bg-panel px-5 py-4">
      <p className="mb-1 text-sm font-medium">Browser extension</p>
      <p className="mb-3 max-w-prose text-sm text-ink-soft">
        Check the fit right from a listing page, without pasting a link — works on sites that
        block Mind the Fit from reading them directly.
      </p>

      {token ? (
        <div className="mb-3">
          <p className="mb-2 text-xs text-ink-faint">
            Copy this code, open the Mind the Fit extension, and paste it in. It&apos;s shown only once.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 overflow-x-auto rounded border border-line-strong bg-bg px-3 py-2 text-xs">
              {token}
            </code>
            <button
              onClick={copy}
              className="shrink-0 rounded border border-line-strong px-3 py-2 text-xs hover:border-accent hover:text-accent"
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
      ) : (
        connected && (
          <p className="mb-3 text-xs text-ink-faint">
            An extension is connected. Regenerating the code disconnects it until you reconnect
            with the new one.
          </p>
        )
      )}

      {error && <p className="mb-3 text-sm text-bad">{error}</p>}

      <div className="flex gap-3">
        <button
          onClick={generate}
          disabled={busy || connected === null}
          className="rounded bg-accent px-3 py-1.5 text-xs font-medium text-bg hover:bg-accent-strong disabled:opacity-50"
        >
          {connected ? "Regenerate code" : "Generate connection code"}
        </button>
        {connected && !token && (
          <button
            onClick={disconnect}
            disabled={busy}
            className="text-xs text-ink-faint underline hover:text-bad disabled:opacity-50"
          >
            Disconnect
          </button>
        )}
      </div>
    </div>
  );
}
