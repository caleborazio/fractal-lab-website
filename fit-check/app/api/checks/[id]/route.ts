import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { actualFit } = await req.json();

  const check = await prisma.fitCheck.update({
    where: { id },
    data: { actualFit },
  });

  return NextResponse.json({ check });
}
