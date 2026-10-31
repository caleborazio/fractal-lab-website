"use client";

import { useEffect } from "react";
import { cleanRef, REF_COOKIE, REF_COOKIE_MAX_AGE } from "@/lib/referral";

// Remembers the first ?ref= link someone arrives on (see lib/referral.ts).
// A later link doesn't overwrite it -- credit goes to whoever sent them first.
export function RefCapture() {
  useEffect(() => {
    const ref = cleanRef(new URLSearchParams(window.location.search).get("ref"));
    if (!ref || document.cookie.split("; ").some((c) => c.startsWith(`${REF_COOKIE}=`))) return;
    document.cookie = `${REF_COOKIE}=${ref}; Max-Age=${REF_COOKIE_MAX_AGE}; Path=/; SameSite=Lax; Secure`;
  }, []);
  return null;
}
