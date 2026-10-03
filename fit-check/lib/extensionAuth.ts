import { createHash, randomBytes } from "crypto";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

const LAST_USED_RESOLUTION_MS = 60 * 60 * 1000;

export function newConnectionCode(): string {
  return `mtf_${randomBytes(24).toString("hex")}`;
}

// Only this hash is stored; the code itself is shown once at creation.
export function hashConnectionCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

/**
 * The browser extension, iPhone app and Shortcuts can't hold a Clerk session
 * cookie the way a page on mindthefit.com can, so they send a connection
 * code as a bearer token instead (created in Settings → Connections).
 */
export async function getProfileIdFromExtensionToken(req: NextRequest): Promise<string | null> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const code = authHeader.slice("Bearer ".length).trim();
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
