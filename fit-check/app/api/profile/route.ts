import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEmailForUserId } from "@/lib/auth";
import { getRequestUserId, isAppRequest } from "@/lib/extensionAuth";
import { checkUsage } from "@/lib/usage";
import { cleanRef, REF_COOKIE } from "@/lib/referral";

export async function GET(req: NextRequest) {
  const userId = await getRequestUserId(req);
  if (!userId) return NextResponse.json({ profile: null, usage: null }, { status: 401 });

  const profile = await prisma.profile.findUnique({ where: { id: userId } });
  const usage = await checkUsage(userId);
  // The app's Account tab has no Clerk session to read these from.
  const account = isAppRequest(req)
    ? { email: await getEmailForUserId(userId), plan: profile?.plan ?? "free" }
    : undefined;
  return NextResponse.json({ profile, usage, account });
}

export async function POST(req: NextRequest) {
  const userId = await getRequestUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }

  const body = await req.json();
  const { bust, waist, hip, height, inseam, shoulderToInseam } = body;

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

  const optionalFields = {
    height: height ?? null,
    inseam: inseam ?? null,
    shoulderToInseam: shoulderToInseam ?? null,
  };
  // A share link's ?ref= cookie is credited once, when the profile is created.
  const referredBy = cleanRef(req.cookies.get(REF_COOKIE)?.value);
  const profile = await prisma.profile.upsert({
    where: { id: userId },
    update: { bust, waist, hip, ...optionalFields },
    create: { id: userId, bust, waist, hip, ...optionalFields, referredBy },
  });

  return NextResponse.json({ profile });
}
