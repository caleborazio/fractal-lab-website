import { createHash, randomBytes } from "crypto";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/auth";

const LAST_USED_RESOLUTION_MS = 60 * 60 * 1000;

export function newConnectionCode(): string {
  return `mtf_${randomBytes(24).toString("hex")}`;
}

// Only this hash is stored; the code itself is shown once at creation.
export function hashConnectionCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

function bearerCode(req: NextRequest): string | null {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  return authHeader.slice("Bearer ".length).trim() || null;
}

/**
 * The browser extension and iPhone app can't hold a Clerk session cookie the
 * way a page on mindthefit.com can, so they send a connection code as a
 * bearer token instead. They get one by signing in at /connect/[target],
 * which hands the code straight to them; Settings → Connections can also
 * create one to paste by hand.
 */
export async function getProfileIdFromExtensionToken(req: NextRequest): Promise<string | null> {
  const code = bearerCode(req);
  if (!code) return null;

  const connection = await prisma.connectionToken.findUnique({
    where: { tokenHash: hashConnectionCode(code) },
    select: { id: true, profileId: true, lastUsedAt: true },
  });
  if (!connection) return null;

  // Hourly resolution is plenty for "last used" -- avoids a write per check.
  const stale =
    !connection.lastUsedAt || Date.now() - connection.lastUsedAt.getTime() > LAST_USED_RESOLUTION_MS;
  if (stale) {
    await prisma.connectionToken
      .update({ where: { id: connection.id }, data: { lastUsedAt: new Date() } })
      .catch(() => {});
  }
  return connection.profileId;
}

/** Deletes the connection whose code is on this request (signing out of the
 * app or extension), so it doesn't linger in Settings → Connections. */
export async function revokeConnectionFromRequest(req: NextRequest): Promise<boolean> {
  const code = bearerCode(req);
  if (!code) return false;
  const result = await prisma.connectionToken.deleteMany({ where: { tokenHash: hashConnectionCode(code) } });
  return result.count > 0;
}

/**
 * For routes the website and the iPhone app share (measurements, history):
 * a connection code in the Authorization header if one was sent, otherwise
 * the website's signed-in session. A header that's present but wrong never
 * falls back to the cookie.
 */
export async function getRequestUserId(req: NextRequest): Promise<string | null> {
  if (req.headers.get("authorization")?.startsWith("Bearer ")) {
    return getProfileIdFromExtensionToken(req);
  }
  return getUserId();
}

export function isAppRequest(req: NextRequest): boolean {
  return !!req.headers.get("authorization")?.startsWith("Bearer ");
}
