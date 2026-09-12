import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

const COOKIE = "ffc_profile";

export async function GET() {
  const jar = await cookies();
  const id = jar.get(COOKIE)?.value;
  if (!id) return NextResponse.json({ profile: null });

  const profile = await prisma.profile.findUnique({ where: { id } });
  return NextResponse.json({ profile });
}

export async function POST(req: NextRequest) {
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

  const jar = await cookies();
  const existingId = jar.get(COOKIE)?.value;

  const profile = existingId
    ? await prisma.profile.update({
        where: { id: existingId },
        data: { bust, waist, hip, height: height ?? null },
      })
    : await prisma.profile.create({
        data: { bust, waist, hip, height: height ?? null },
      });

  const res = NextResponse.json({ profile });
  res.cookies.set(COOKIE, profile.id, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  });
  return res;
}
