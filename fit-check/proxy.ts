// Next 16 renamed middleware.ts → proxy.ts. When Clerk keys are present this
// runs Clerk's session handling; without keys (local dev bypass) it's a no-op.
import { NextResponse } from "next/server";

const clerkEnabled = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

async function buildProxy() {
  if (!clerkEnabled) return () => NextResponse.next();
  const { clerkMiddleware } = await import("@clerk/nextjs/server");
  return clerkMiddleware();
}

const handler = buildProxy();

export default async function proxy(
  ...args: Parameters<Awaited<ReturnType<typeof buildProxy>>>
) {
  return (await handler)(...args);
}

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
