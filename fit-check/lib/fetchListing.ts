import * as cheerio from "cheerio";

export interface FetchedListing {
  text: string;
  images: { base64: string; mimeType: string }[];
}

const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";

const PAGE_TIMEOUT_MS = 8000;
const IMAGE_TIMEOUT_MS = 6000;
// Poshmark hard-caps listings at 16 photos; other resale sites are similar
// or smaller. At ~1,000 Gemini tokens/image this is trivially cheap (~1.5
// cents per check even at 16), so cap on "that's the real ceiling," not cost.
const MAX_IMAGES = 16;
const MAX_IMAGE_BYTES = 6 * 1024 * 1024;

// Site chrome (logos, icons, tracking pixels) that shows up in <img> tags
// alongside the actual listing photos -- not something we want to hand Gemini.
const JUNK_IMAGE_PATTERN = /logo|icon|sprite|avatar|pixel|spacer|favicon|placeholder/i;
const IMAGE_EXTENSION_PATTERN = /\.(jpe?g|png|webp)(\?|$)/i;

function withTimeoutSignal(ms: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, clear: () => clearTimeout(timer) };
}

export async function fetchImageAsBase64(
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
 * Balanced-brace JSON extraction starting right after `marker` in `html`.
 * Regex can't reliably find the end of a deeply nested JSON blob (a
 * non-greedy `.*?}` stops at the first plausible `}`, which is wrong as
 * soon as the object contains any nested object of its own).
 */
function extractJsonAfter(html: string, marker: string): unknown | null {
  const markerIndex = html.indexOf(marker);
  if (markerIndex === -1) return null;
  const start = markerIndex + marker.length;

  let depth = 0;
  let inString = false;
  let escaped = false;
  let end = -1;
  for (let i = start; i < html.length; i++) {
    const ch = html[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
    } else {
      if (ch === '"') inString = true;
      else if (ch === "{") depth++;
      else if (ch === "}") {
        depth--;
        if (depth === 0) {
          end = i + 1;
          break;
        }
      }
    }
  }
  if (end === -1) return null;

  try {
    return JSON.parse(html.slice(start, end));
  } catch {
    return null;
  }
}

interface PoshmarkComment {
  comment?: string;
  creator_username?: string;
}

interface PoshmarkPicture {
  url_large?: string;
  url?: string;
  url_small?: string;
}

interface PoshmarkListingDetails {
  title?: string;
  description?: string;
  size?: string;
  size_obj?: { display_with_size_system?: string; display?: string };
  brand?: string;
  comments?: PoshmarkComment[];
  pictures?: PoshmarkPicture[];
}

interface PoshmarkExtraction {
  text: string;
  imageUrls: string[];
}

/**
 * Poshmark (and likely similar Vue-SSR resale sites) inline the full page
 * state as JSON for client-side hydration -- including the listing's own
 * scoped photo array and its buyer/seller comment thread, neither of which
 * reliably show up by scraping rendered <img> tags (lazy-loaded thumbnails,
 * "similar items" carousels mixed into the DOM) or JSON-LD (no comments,
 * sometimes only a single representative photo).
 */
function extractPoshmarkState(html: string): PoshmarkExtraction | null {
  const state = extractJsonAfter(html, "window.__INITIAL_STATE__=") as
    | { $_listing_details?: { listingDetails?: PoshmarkListingDetails } }
    | null;
  const details = state?.$_listing_details?.listingDetails;
  if (!details) return null;

  const commentsText = Array.isArray(details.comments)
    ? details.comments
        .filter((c) => c?.comment)
        .slice(0, 15)
        .map((c) => (c.creator_username ? `@${c.creator_username}: ${c.comment}` : c.comment))
        .join("\n")
    : "";

  const size = details.size_obj?.display_with_size_system || details.size_obj?.display || details.size;

  const textParts = [
    details.title,
    details.brand ? `Brand: ${details.brand}` : null,
    size ? `Size (as listed): ${size}` : null,
    details.description,
    commentsText ? `Buyer/seller comments on this listing:\n${commentsText}` : null,
  ].filter((s): s is string => !!s && s.trim().length > 0);

  const imageUrls = Array.isArray(details.pictures)
    ? details.pictures
        .map((p) => p.url_large || p.url || p.url_small)
        .filter((u): u is string => !!u)
    : [];

  if (textParts.length === 0 && imageUrls.length === 0) return null;

  return { text: textParts.join("\n\n").slice(0, 6000), imageUrls };
}

interface JsonLdProduct {
  name?: string;
  description?: string;
  image?: string | string[];
  brand?: string | { name?: string };
}

function brandName(brand: JsonLdProduct["brand"]): string | null {
  if (!brand) return null;
  if (typeof brand === "string") return brand;
  return brand.name ?? null;
}

/**
 * Generic fallback for sites without a Poshmark-style state blob: schema.org
 * Product JSON-LD (common SEO practice), then og:tags, then <title>/<img>.
 */
function extractGeneric(
  html: string,
  baseUrl: string
): { text: string; imageUrls: string[] } {
  const $ = cheerio.load(html);

  function findJsonLdProduct(): JsonLdProduct | null {
    const scripts = $('script[type="application/ld+json"]').toArray();
    for (const el of scripts) {
      try {
        const data = JSON.parse($(el).contents().text());
        const candidates: unknown[] = Array.isArray(data)
          ? data
          : Array.isArray((data as { "@graph"?: unknown[] })["@graph"])
          ? (data as { "@graph": unknown[] })["@graph"]
          : [data];
        for (const c of candidates) {
          const type = (c as { "@type"?: string | string[] })?.["@type"];
          const isProduct = type === "Product" || (Array.isArray(type) && type.includes("Product"));
          if (isProduct) return c as JsonLdProduct;
        }
      } catch {
        // Malformed JSON-LD isn't unusual -- just skip it.
      }
    }
    return null;
  }
  const product = findJsonLdProduct();

  const title =
    product?.name || $('meta[property="og:title"]').attr("content") || $("title").first().text() || null;
  const description =
    product?.description ||
    $('meta[property="og:description"]').attr("content") ||
    $('meta[name="description"]').attr("content") ||
    null;
  const brand = brandName(product?.brand);
  // Many sites (Vinted included) mark up a size field with schema.org
  // microdata (itemprop="size") even without a JSON-LD equivalent.
  const sizeFromMicrodata = $("[itemprop='size']").first().text().trim() || null;

  const text = [
    title,
    brand ? `Brand: ${brand}` : null,
    sizeFromMicrodata ? `Size (as listed): ${sizeFromMicrodata}` : null,
    description,
  ]
    .filter((s): s is string => !!s && s.trim().length > 0)
    .join("\n\n")
    .slice(0, 4000);

  // JSON-LD/og:image is the site's OWN declared photo for this exact listing
  // -- authoritative. Scraping every <img> on the page is not: it happily
  // picks up a seller's avatar, "similar items" thumbnails, or other listings
  // entirely, since there's no per-listing scoping to rely on the way
  // Poshmark's structured photo array has. Only fall back to page-wide <img>
  // scraping when there's no authoritative image at all to go on.
  const authoritativeUrls: string[] = [];
  if (typeof product?.image === "string") authoritativeUrls.push(product.image);
  else if (Array.isArray(product?.image)) authoritativeUrls.push(...product.image);
  const ogImage = $('meta[property="og:image"]').attr("content");
  if (ogImage) authoritativeUrls.push(ogImage);

  const candidateUrls: string[] = [...authoritativeUrls];
  if (authoritativeUrls.length === 0) {
    $("img").each((_, el) => {
      const src = $(el).attr("src") || $(el).attr("data-src");
      if (src) candidateUrls.push(src);
    });
  }

  const absoluteCandidates = candidateUrls
    .map((src) => {
      try {
        return new URL(src, baseUrl).toString();
      } catch {
        return null;
      }
    })
    .filter(
      (u): u is string => !!u && !JUNK_IMAGE_PATTERN.test(u) && IMAGE_EXTENSION_PATTERN.test(u)
    );

  // Same photo often served at multiple sizes (s_/l_, thumb/large) -- dedupe
  // by a size-agnostic key and prefer the larger-looking variant.
  const bySizeAgnosticKey = new Map<string, string>();
  const order: string[] = [];
  const isLargeVariant = (u: string) => /\/(l|xl|large|orig|original)_/i.test(u);
  for (const url of absoluteCandidates) {
    const key = url.replace(/\/(s|m|l|xl|thumb|small|medium|large|orig|original)_/i, "/_");
    const existing = bySizeAgnosticKey.get(key);
    if (!existing) {
      bySizeAgnosticKey.set(key, url);
      order.push(key);
    } else if (isLargeVariant(url) && !isLargeVariant(existing)) {
      bySizeAgnosticKey.set(key, url);
    }
  }

  return { text, imageUrls: order.map((key) => bySizeAgnosticKey.get(key)!) };
}

/**
 * Fetches a listing URL and pulls out whatever's usable: the seller's own
 * description and size (plus buyer/seller comments, when the site exposes
 * them), and the listing's actual photos. Returns null on any failure -- the
 * caller should degrade to treating the pasted text as plain text rather
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

  const extracted = extractPoshmarkState(html) ?? extractGeneric(html, url);

  const fetchedImages = await Promise.all(
    extracted.imageUrls.slice(0, MAX_IMAGES).map(fetchImageAsBase64)
  );
  const images = fetchedImages
    .filter((img): img is { base64: string; mimeType: string } => !!img)
    .slice(0, MAX_IMAGES);

  if (!extracted.text && images.length === 0) return null;

  return { text: extracted.text, images };
}
