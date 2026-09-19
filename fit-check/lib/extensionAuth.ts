import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * The browser extension can't hold a Clerk session cookie the way a page on
 * mindthefit.com can, so it authenticates with a bearer token instead
 * (generated from Settings, stored on Profile.extensionToken).
 */
export async function getProfileIdFromExtensionToken(req: NextRequest): Promise<string | null> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.slice("Bearer ".length).trim();
  if (!token) return null;

  const profile = await prisma.profile.findUnique({ where: { extensionToken: token } });
  return profile?.id ?? null;
}
