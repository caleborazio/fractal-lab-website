import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/auth";

export async function GET() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ connected: false });

  const profile = await prisma.profile.findUnique({
    where: { id: userId },
    select: { extensionToken: true },
  });
  return NextResponse.json({ connected: !!profile?.extensionToken });
}

// Regenerating invalidates whatever token an already-connected extension is
// holding -- the new value is only ever returned here, once, same as any
// other API-key-style secret.
export async function POST() {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }

  const token = `mtf_${randomBytes(24).toString("hex")}`;
  await prisma.profile.update({ where: { id: userId }, data: { extensionToken: token } });
  return NextResponse.json({ token });
}

export async function DELETE() {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }

  await prisma.profile.update({ where: { id: userId }, data: { extensionToken: null } });
  return NextResponse.json({ ok: true });
}
