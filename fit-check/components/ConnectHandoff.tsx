"use client";

import { useEffect, useRef, useState } from "react";
import { MeasurementsForm } from "@/components/MeasurementsForm";

export type ConnectTarget = "app" | "extension";

// The iPhone app opens this page in a system sign-in sheet that watches for a
// navigation to this scheme -- that navigation is how the code reaches the app.
const APP_CALLBACK = "mindthefit://connected";

// window.postMessage tags shared with the extension's connect.js content script.
const FROM_SITE = "mind-the-fit-site";
const FROM_EXTENSION = "mind-the-fit-extension";
const EXTENSION_WAIT_MS = 2000;

type Phase = "measurements" | "ready" | "working" | "done" | "error";

function extensionLabel(): string {
  if (/Edg\//.test(navigator.userAgent)) return "Edge extension";
  return "Chrome extension";
}

export function ConnectHandoff({
  target,
  email,
  hasProfile,
}: {
  target: ConnectTarget;
  email: string | null;
  hasProfile: boolean;
}) {
  const [phase, setPhase] = useState<Phase>(hasProfile ? "ready" : "measurements");
  const [error, setError] = useState<string | null>(null);
  const [returnUrl, setReturnUrl] = useState<string | null>(null);
  // null = still listening; false = no extension answered on this page.
  const [extensionFound, setExtensionFound] = useState<boolean | null>(target === "app" ? true : null);
  const ackRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (target !== "extension") return;
    function onMessage(event: MessageEvent) {
      if (event.source !== window || event.origin !== window.location.origin) return;
      const data = event.data;
      if (!data || data.source !== FROM_EXTENSION) return;
      if (data.type === "ready") setExtensionFound(true);
      if (data.type === "connected") ackRef.current?.();
    }
    window.addEventListener("message", onMessage);
    // The content script also announces itself on load; this covers it
    // loading before this listener existed.
    window.postMessage({ source: FROM_SITE, type: "hello" }, window.location.origin);
    const timer = setTimeout(() => setExtensionFound((found) => found ?? false), EXTENSION_WAIT_MS);
    return () => {
      window.removeEventListener("message", onMessage);
      clearTimeout(timer);
    };
  }, [target]);

  async function createConnection(label: string): Promise<{ code: string; id: string }> {
    const res = await fetch("/api/connections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.code) throw new Error(data.error ?? "Couldn't connect. Try again.");
    return { code: data.code, id: data.connection.id };
  }

  async function connect() {
    setPhase("working");
    setError(null);
    try {
      if (target === "app") {
        const { code } = await createConnection("iPhone app");
        const url = `${APP_CALLBACK}?code=${encodeURIComponent(code)}`;
        setReturnUrl(url);
        setPhase("done");
        window.location.href = url;
        return;
      }

      const { code, id } = await createConnection(extensionLabel());
      const acknowledged = await new Promise<boolean>((resolve) => {
        const timer = setTimeout(() => resolve(false), 3000);
        ackRef.current = () => {
          clearTimeout(timer);
          resolve(true);
        };
        window.postMessage({ source: FROM_SITE, type: "connect", code }, window.location.origin);
      });
      ackRef.current = null;
      if (!acknowledged) {
        // Don't leave an unused code behind in Settings → Connections.
        await fetch(`/api/connections/${id}`, { method: "DELETE" }).catch(() => {});
        throw new Error("The extension didn't respond. Reload this page and try again.");
      }
      setPhase("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't connect. Try again.");
      setPhase("error");
    }
  }

  const what = target === "app" ? "the Mind the Fit iPhone app" : "this browser's Mind the Fit extension";

  if (phase === "measurements") {
    return (
      <div>
        <h1 className="mb-3 text-4xl">First, your measurements</h1>
        <p className="mb-6 text-sm text-ink-soft">
          Every listing gets compared against these. It takes a minute, and you only do it once.
        </p>
        <MeasurementsForm saveLabel="Save and continue" onSaved={() => setPhase("ready")} />
      </div>
    );
  }

  if (phase === "done") {
    return (
      <div>
        <h1 className="mb-3 text-4xl">Connected</h1>
        {target === "app" ? (
          <>
            <p className="mb-6 text-sm text-ink-soft">Heading back to the app…</p>
            {returnUrl && (
              <a
                href={returnUrl}
                className="inline-block bg-accent px-6 py-3.5 font-mono text-sm font-semibold uppercase tracking-wider text-bg hover:bg-accent-strong"
              >
                Return to Mind the Fit
              </a>
            )}
          </>
        ) : (
          <p className="text-sm text-ink-soft">
            You can close this tab. On any listing, click the Mind the Fit icon in your toolbar to
            check the fit.
          </p>
        )}
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-3 text-4xl">
        Connect {target === "app" ? "the iPhone app" : "this browser"}
      </h1>
      <p className="mb-6 text-sm text-ink-soft">
        This lets {what} check fits against your measurements and save them to your history
        {email ? (
          <>
            {" "}
            as <strong className="text-ink">{email}</strong>
          </>
        ) : null}
        .
      </p>

      {extensionFound === false ? (
        <p className="mb-4 text-sm text-bad">
          The Mind the Fit extension isn’t answering on this page. Make sure it’s installed
          and turned on, then reload.
        </p>
      ) : null}
      {error && <p className="mb-4 text-sm text-bad">{error}</p>}

      <button
        onClick={connect}
        disabled={phase === "working" || !extensionFound}
        className="w-full bg-accent px-6 py-4 font-mono text-sm font-semibold uppercase tracking-wider text-bg hover:bg-accent-strong disabled:opacity-50"
      >
        {phase === "working" ? "Connecting…" : "Connect"}
      </button>
    </div>
  );
}
