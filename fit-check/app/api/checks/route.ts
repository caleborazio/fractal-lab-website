import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/auth";

export async function GET() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ checks: [] });

  const checks = await prisma.fitCheck.findMany({
    where: { profileId: userId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  return NextResponse.json({ checks });
}

export async function POST(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }

  const body = await req.json();
  const {
    brand,
    garmentType,
    sourceUrl,
    bust,
    waist,
    hip,
    length,
    rawExtraction,
    verdict,
    actualFit,
    images,
  } = body;

  const check = await prisma.fitCheck.create({
    data: {
      profileId: userId,
      brand: brand ?? null,
      garmentType: garmentType ?? "dress",
      sourceUrl: sourceUrl ?? null,
      bust: bust ?? null,
      waist: waist ?? null,
      hip: hip ?? null,
      length: length ?? null,
      rawExtraction: rawExtraction ?? undefined,
      verdict: verdict ?? undefined,
      actualFit: actualFit ?? null,
      images: images ?? undefined,
      confirmed: true,
    },
  });

  return NextResponse.json({ check });
}
