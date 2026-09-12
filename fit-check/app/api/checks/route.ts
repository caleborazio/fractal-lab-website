import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

const COOKIE = "ffc_profile";

export async function GET() {
  const jar = await cookies();
  const profileId = jar.get(COOKIE)?.value;
  if (!profileId) return NextResponse.json({ checks: [] });

  const checks = await prisma.fitCheck.findMany({
    where: { profileId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  return NextResponse.json({ checks });
}

export async function POST(req: NextRequest) {
  const jar = await cookies();
  const profileId = jar.get(COOKIE)?.value;
  if (!profileId) {
    return NextResponse.json({ error: "No profile yet." }, { status: 400 });
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
  } = body;

  const check = await prisma.fitCheck.create({
    data: {
      profileId,
      brand: brand ?? null,
      garmentType: garmentType ?? "dress",
      sourceUrl: sourceUrl ?? null,
      bust: bust ?? null,
      waist: waist ?? null,
      hip: hip ?? null,
      length: length ?? null,
      rawExtraction: rawExtraction ?? undefined,
      verdict: verdict ?? undefined,
      confirmed: true,
    },
  });

  return NextResponse.json({ check });
}
