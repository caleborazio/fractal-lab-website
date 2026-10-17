import { NextRequest, NextResponse } from "next/server";
import { revokeConnectionFromRequest } from "@/lib/extensionAuth";

// Called by the iPhone app and browser extension when someone signs out.
// The code itself is the credential, so whoever holds it may revoke it.
export async function POST(req: NextRequest) {
  const revoked = await revokeConnectionFromRequest(req);
  return NextResponse.json({ ok: true, revoked });
}
