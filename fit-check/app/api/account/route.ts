import { NextRequest, NextResponse } from "next/server";
import { getRequestUserId } from "@/lib/extensionAuth";
import { deleteAccount } from "@/lib/account";
import { SUPPORT_EMAIL } from "@/lib/site";

// Shared by the website (signed-in session) and the iPhone app (connection
// code), like the other account routes.
export async function DELETE(req: NextRequest) {
  const userId = await getRequestUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }

  try {
    await deleteAccount(userId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("account delete error", err);
    return NextResponse.json(
      { error: `Couldn't delete your account. Try again, or email ${SUPPORT_EMAIL}.` },
      { status: 500 }
    );
  }
}
