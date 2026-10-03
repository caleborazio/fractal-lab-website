"use client";

import { useEffect, useState } from "react";

interface Connection {
  id: string;
  label: string;
  createdAt: string;
  lastUsedAt: string | null;
}

function timeAgo(iso: string | null): string {
  if (!iso) return "Never used";
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 60) return "Used in the last hour";
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Used ${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `Used ${days} day${days === 1 ? "" : "s"} ago`;
  return `Last used ${new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;
}

export function ConnectionsManager() {
  const [connections, setConnections] = useState<Connection[] | null>(null);
  const [label, setLabel] = useState("");
  const [created, setCreated] = useState<{ code: string; label: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [confirmRevokeId, setConfirmRevokeId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/connections")
      .then((r) => r.json())
      .then((data) => setConnections(data.connections ?? []))
      .catch(() => setConnections([]));
  }, []);

  async function create() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label }),
      });
      const data = await res.json();
      if (!res.ok || !data.code) throw new Error(data.error ?? "Couldn't create a code.");
      setCreated({ code: data.code, label: data.connection.label });
      setConnections((prev) => [data.connection, ...(prev ?? [])]);
      setLabel("");
      setCopied(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't create a code.");
    } finally {
      setBusy(false);
    }
  }

  async function revoke(id: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/connections/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setConnections((prev) => (prev ? prev.filter((c) => c.id !== id) : prev));
    } catch {
      setError("Couldn't revoke that connection. Try again.");
    } finally {
      setBusy(false);
      setConfirmRevokeId(null);
    }
  }

  async function copy() {
    if (!created) return;
    try {
      await navigator.clipboard.writeText(created.code);
      setCopied(true);
    } catch {
      // Clipboard permission denied -- the code is still selectable on screen.
    }
  }

  return (
    <div className="rounded-lg border border-line bg-panel px-5 py-4">
      <p className="mb-1 text-sm font-medium">Browser extension, iPhone app &amp; Shortcuts</p>
      <p className="mb-4 max-w-prose text-sm text-ink-soft">
        Give each place you check fits from its own code. Revoking one doesn&apos;t affect the
        others.
      </p>

      {created && (
        <div className="mb-4 rounded border border-accent bg-bg px-3 py-3">
          <p className="mb-2 text-xs text-ink-soft">
            Code for <strong className="text-ink">{created.label}</strong> — copy it now. It&apos;s
            only shown once.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 overflow-x-auto rounded border border-line-strong bg-panel px-3 py-2 text-xs">
              {created.code}
            </code>
            <button
              onClick={copy}
              className="shrink-0 rounded border border-line-strong px-3 py-2 text-xs hover:border-accent hover:text-accent"
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <button
            onClick={() => setCreated(null)}
            className="mt-2 text-xs text-ink-faint underline hover:text-accent"
          >
            Done
          </button>
        </div>
      )}

      {connections === null ? (
        <p className="mb-4 text-sm text-ink-faint">Loading…</p>
      ) : connections.length === 0 ? (
        <p className="mb-4 text-sm text-ink-faint">No connections yet.</p>
      ) : (
        <ul className="mb-4 divide-y divide-line rounded border border-line">
          {connections.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-sm text-ink">{c.label}</p>
                <p className="text-xs text-ink-faint">{timeAgo(c.lastUsedAt)}</p>
              </div>
              {confirmRevokeId === c.id ? (
                <button
                  onClick={() => revoke(c.id)}
                  disabled={busy}
                  className="shrink-0 text-xs text-bad underline disabled:opacity-50"
                >
                  Click again to revoke
                </button>
              ) : (
                <button
                  onClick={() => setConfirmRevokeId(c.id)}
                  className="shrink-0 text-xs text-ink-faint underline hover:text-bad"
                >
                  Revoke
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {error && <p className="mb-3 text-sm text-bad">{error}</p>}

      <div className="flex gap-2">
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          maxLength={40}
          placeholder="Name, e.g. iPhone app"
          className="min-w-0 flex-1 rounded border border-line bg-bg px-3 py-1.5 text-sm text-ink outline-none focus:border-accent"
        />
        <button
          onClick={create}
          disabled={busy}
          className="shrink-0 rounded bg-accent px-3 py-1.5 text-xs font-medium text-bg hover:bg-accent-strong disabled:opacity-50"
        >
          Create code
        </button>
      </div>
    </div>
  );
}
