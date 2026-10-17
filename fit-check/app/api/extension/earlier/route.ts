import { NextRequest, NextResponse } from "next/server";
import { getProfileIdFromExtensionToken } from "@/lib/extensionAuth";
import { prisma } from "@/lib/prisma";
import { checkUsage } from "@/lib/usage";
import { findEarlierCheck } from "@/lib/runCheck";

// The extension asks this first when it opens on a page: if this listing was
// already checked, it shows that answer (re-scored against the person's
// current measurements) instead of spending another check. Free to call.
export async function POST(req: NextRequest) {
  const profileId = await getProfileIdFromExtensionToken(req);
  if (!profileId) {
    return NextResponse.json({ error: "Not signed in to Mind the Fit." }, { status: 401 });
  }
  const profile = await prisma.profile.findUnique({ where: { id: profileId } });
  if (!profile) {
    return NextResponse.json({ error: "Account not found." }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const url = typeof body?.url === "string" ? body.url : "";
  const earlier = url ? await findEarlierCheck(profile, url) : null;
  if (!earlier) return NextResponse.json({ found: false });

  const usage = await checkUsage(profileId);
  return NextResponse.json({ found: true, ...earlier, usage });
}
