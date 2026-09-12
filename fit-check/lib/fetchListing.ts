import * as cheerio from "cheerio";

export interface FetchedListing {
  text: string;
  images: { base64: string; mimeType: string }[];
}

const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";

const PAGE_TIMEOUT_MS = 8000;
const IMAGE_TIMEOUT_MS = 6000;
const MAX_IMAGES = 4;
const MAX_IMAGE_BYTES = 6 * 1024 * 1024;

// Site chrome (logos, icons, tracking pixels) that shows up in <img> tags
// alongside the actual listing photos -- not something we want to hand Gemini.
const JUNK_IMAGE_PATTERN = /logo|icon|sprite|avatar|pixel|spacer|favicon|placeholder/i;
const IMAGE_EXTENSION_PATTERN = /\.(jpe?g|png|webp)(\?|$)/i;

interface JsonLdProduct {
  name?: string;
  description?: string;
  image?: string | string[];
}

function withTimeoutSignal(ms: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, clear: () => clearTimeout(timer) };
}

/**
 * Many resale/e-commerce sites (Poshmark included) embed a schema.org Product
 * block for SEO -- it often has the seller's real description verbatim, which
 * sometimes already states measurements as plain text. Worth checking before
 * falling back to page title/meta tags.
 */
function extractJsonLdProduct($: cheerio.CheerioAPI): JsonLdProduct | null {
  let found: JsonLdProduct | null = null;
  $('script[type="application/ld+json"]').each((_, el) => {
    if (found) return;
    try {
      const data = JSON.parse($(el).contents().text());
      const candidates: unknown[] = Array.isArray(data)
        ? data
        : Array.isArray((data as { "@graph"?: unknown[] })["@graph"])
        ? (data as { "@graph": unknown[] })["@graph"]
        : [data];
      for (const c of candidates) {
        const type = (c as { "@type"?: string | string[] })?.["@type"];
        const isProduct =
          type === "Product" || (Array.isArray(type) && type.includes("Product"));
        if (isProduct) {
          found = c as JsonLdProduct;
          break;
        }
      }
    } catch {
      // Malformed JSON-LD isn't unusual -- just skip it.
    }
  });
  return found;
}

function absoluteUrl(src: string, base: string): string | null {
  try {
    return new URL(src, base).toString();
  } catch {
    return null;
  }
}

/**
 * Sites frequently serve the same photo at multiple sizes (s_/l_, thumb/large,
 * etc). Group by a size-agnostic key and keep the larger-looking variant --
 * more readable for a tag or handwritten measurement card.
 */
function dedupeAndRankImages(urls: string[]): string[] {
  const bySizeAgnosticKey = new Map<string, string>();
  const order: string[] = [];
  const isLargeVariant = (u: string) => /\/(l|xl|large|orig|original)_/i.test(u);

  for (const url of urls) {
    const key = url.replace(/\/(s|m|l|xl|thumb|small|medium|large|orig|original)_/i, "/_");
    const existing = bySizeAgnosticKey.get(key);
    if (!existing) {
      bySizeAgnosticKey.set(key, url);
      order.push(key);
    } else if (isLargeVariant(url) && !isLargeVariant(existing)) {
      bySizeAgnosticKey.set(key, url);
    }
  }
  return order.map((key) => bySizeAgnosticKey.get(key)!);
}

async function fetchImageAsBase64(
  url: string
): Promise<{ base64: string; mimeType: string } | null> {
  const { signal, clear } = withTimeoutSignal(IMAGE_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal, headers: { "User-Agent": BROWSER_UA } });
    if (!res.ok) return null;
    const mimeType = res.headers.get("content-type")?.split(";")[0] ?? "";
    if (!mimeType.startsWith("image/")) return null;
    const buf = await res.arrayBuffer();
    if (buf.byteLength > MAX_IMAGE_BYTES) return null;
    return { base64: Buffer.from(buf).toString("base64"), mimeType };
  } catch {
    return null;
  } finally {
    clear();
  }
}

/**
 * Fetches a listing URL and pulls out whatever's usable: the seller's own
 * description text (which sometimes already has measurements written out),
 * and a handful of the actual listing photos. Returns null on any failure --
 * the caller should degrade to treating the pasted text as plain text rather
 * than erroring out.
 */
export async function fetchListing(url: string): Promise<FetchedListing | null> {
  const { signal, clear } = withTimeoutSignal(PAGE_TIMEOUT_MS);
  let html: string;
  try {
    const res = await fetch(url, {
      signal,
      headers: { "User-Agent": BROWSER_UA, Accept: "text/html,application/xhtml+xml" },
    });
    if (!res.ok) return null;
    html = await res.text();
  } catch {
    return null;
  } finally {
    clear();
  }

  const $ = cheerio.load(html);
  const product = extractJsonLdProduct($);

  const title =
    product?.name || $('meta[property="og:title"]').attr("content") || $("title").first().text() || null;
  const description =
    product?.description ||
    $('meta[property="og:description"]').attr("content") ||
    $('meta[name="description"]').attr("content") ||
    null;

  const text = [title, description]
    .filter((s): s is string => !!s && s.trim().length > 0)
    .join("\n\n")
    .slice(0, 4000);

  const candidateUrls: string[] = [];
  if (typeof product?.image === "string") candidateUrls.push(product.image);
  else if (Array.isArray(product?.image)) candidateUrls.push(...product.image);

  const ogImage = $('meta[property="og:image"]').attr("content");
  if (ogImage) candidateUrls.push(ogImage);

  $("img").each((_, el) => {
    const src = $(el).attr("src") || $(el).attr("data-src");
    if (src) candidateUrls.push(src);
  });

  const absoluteCandidates = candidateUrls
    .map((src) => absoluteUrl(src, url))
    .filter(
      (u): u is string => !!u && !JUNK_IMAGE_PATTERN.test(u) && IMAGE_EXTENSION_PATTERN.test(u)
    );

  const ranked = dedupeAndRankImages(absoluteCandidates).slice(0, MAX_IMAGES * 2);
  const fetchedImages = await Promise.all(ranked.map(fetchImageAsBase64));
  const images = fetchedImages
    .filter((img): img is { base64: string; mimeType: string } => !!img)
    .slice(0, MAX_IMAGES);

  if (!text && images.length === 0) return null;

  return { text, images };
}
