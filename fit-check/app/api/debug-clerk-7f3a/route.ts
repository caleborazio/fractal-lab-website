// TEMPORARY -- remove after diagnosing the production sign-in loop. Reports
// only the shape of CLERK_SECRET_KEY (never the value) and whether Clerk's
// Backend API accepts it.
export const dynamic = "force-dynamic";

export async function GET() {
  const key = process.env.CLERK_SECRET_KEY ?? "";
  const shape = {
    set: key.length > 0,
    prefix: key.startsWith("sk_live_") ? "sk_live_" : key.startsWith("sk_test_") ? "sk_test_" : "other",
    length: key.length,
    plainCharsOnly: /^[A-Za-z0-9_]+$/.test(key),
    edgeWhitespace: key !== key.trim(),
  };
  let jwks: number | string;
  try {
    const res = await fetch("https://api.clerk.com/v1/jwks", { headers: { Authorization: `Bearer ${key}` } });
    jwks = res.status;
  } catch (err) {
    jwks = err instanceof Error ? `${err.name}: ${err.message.slice(0, 80)}` : "error";
  }
  return Response.json({ ...shape, jwks });
}
