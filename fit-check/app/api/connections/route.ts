import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/auth";
import { hashConnectionCode, newConnectionCode } from "@/lib/extensionAuth";

const MAX_CONNECTIONS = 20;
const MAX_LABEL_LENGTH = 40;

export async function GET() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ connections: [] }, { status: 401 });

  const connections = await prisma.connectionToken.findMany({
    where: { profileId: userId },
    orderBy: { createdAt: "desc" },
    select: { id: true, label: true, createdAt: true, lastUsedAt: true },
  });
  return NextResponse.json({ connections });
}

// Adds a code without touching any existing one. The code is returned here
// once and never again -- only its hash is stored.
export async function POST(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }

  const count = await prisma.connectionToken.count({ where: { profileId: userId } });
  if (count >= MAX_CONNECTIONS) {
    return NextResponse.json(
      { error: `You can have up to ${MAX_CONNECTIONS} connections. Revoke one you no longer use first.` },
      { status: 400 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const rawLabel = typeof body?.label === "string" ? body.label.trim() : "";
  const label = rawLabel.slice(0, MAX_LABEL_LENGTH) || "Connection";

  const code = newConnectionCode();
  const connection = await prisma.connectionToken.create({
    data: { profileId: userId, label, tokenHash: hashConnectionCode(code) },
    select: { id: true, label: true, createdAt: true, lastUsedAt: true },
  });
  return NextResponse.json({ code, connection });
}
