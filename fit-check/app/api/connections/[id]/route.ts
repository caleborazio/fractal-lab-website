import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/auth";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }

  const { id } = await params;
  // Scoped to the signed-in user, so one account can't revoke another's.
  const result = await prisma.connectionToken.deleteMany({ where: { id, profileId: userId } });
  if (result.count === 0) {
    return NextResponse.json({ error: "Connection not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
