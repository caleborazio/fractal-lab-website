import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/auth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }

  const { id } = await params;
  const { actualFit } = await req.json();

  // updateMany + profileId filter, not update-by-id alone -- otherwise
  // anyone signed in could patch anyone else's check just by guessing an id.
  const result = await prisma.fitCheck.updateMany({
    where: { id, profileId: userId },
    data: { actualFit },
  });

  if (result.count === 0) {
    return NextResponse.json({ error: "Check not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
