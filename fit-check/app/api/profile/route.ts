import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/auth";
import { checkUsage } from "@/lib/usage";

export async function GET() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ profile: null, usage: null }, { status: 401 });

  const profile = await prisma.profile.findUnique({ where: { id: userId } });
  const usage = await checkUsage(userId);
  return NextResponse.json({ profile, usage });
}

export async function POST(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }

  const body = await req.json();
  const { bust, waist, hip, height } = body;

  if (
    typeof bust !== "number" ||
    typeof waist !== "number" ||
    typeof hip !== "number"
  ) {
    return NextResponse.json(
      { error: "bust, waist, and hip are required numbers" },
      { status: 400 }
    );
  }

  const profile = await prisma.profile.upsert({
    where: { id: userId },
    update: { bust, waist, hip, height: height ?? null },
    create: { id: userId, bust, waist, hip, height: height ?? null },
  });

  return NextResponse.json({ profile });
}
