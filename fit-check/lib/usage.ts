import { prisma } from "@/lib/prisma";
import { FREE_CHECKS_PER_MONTH } from "@/lib/plan";

function currentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export interface UsageStatus {
  allowed: boolean;
  checksUsed: number;
  /** null means unlimited (paid plan). */
  checksRemaining: number | null;
}

/**
 * Reports whether a profile can run another check right now -- doesn't
 * consume one. A month boundary is handled by simply ignoring a stale
 * counter rather than a separate reset step: no profile lookup is needed
 * to know the current month, so this reads correctly with zero writes.
 */
export async function checkUsage(profileId: string): Promise<UsageStatus> {
  const profile = await prisma.profile.findUnique({ where: { id: profileId } });
  const month = currentMonthKey();
  const checksUsed = profile && profile.usageMonth === month ? profile.checksUsedThisMonth : 0;

  if (profile?.plan === "paid") {
    return { allowed: true, checksUsed, checksRemaining: null };
  }

  return {
    allowed: checksUsed < FREE_CHECKS_PER_MONTH,
    checksUsed,
    checksRemaining: Math.max(0, FREE_CHECKS_PER_MONTH - checksUsed),
  };
}

/**
 * Call only after a successful extraction -- a failed fetch/read (blocked
 * site, no listing found) shouldn't burn a free check the user never
 * actually got value from.
 */
export async function recordUsage(profileId: string): Promise<void> {
  const profile = await prisma.profile.findUnique({ where: { id: profileId } });
  if (!profile) return;
  const month = currentMonthKey();
  const checksUsed = profile.usageMonth === month ? profile.checksUsedThisMonth : 0;
  await prisma.profile.update({
    where: { id: profileId },
    data: { usageMonth: month, checksUsedThisMonth: checksUsed + 1 },
  });
}
