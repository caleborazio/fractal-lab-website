const API_BASE = "https://www.mindthefit.com";
const TOKEN_KEY = "mtf_token";

let token = null;
let currentTab = null;
let retryAction = null;

const READING_LABEL = {
  tight: "Will be tight",
  fitted: "Fitted, true to size",
  comfortable: "Comfortable, room to move",
  loose: "Loose / oversized",
  no_data: "No measurement given",
};

// tight/loose read as a caution regardless of direction; fitted/comfortable
// read as good; no_data is neutral. Mirrors the web app's tone system.
const READING_TONE = {
  tight: "warn",
  loose: "warn",
  fitted: "good",
  comfortable: "good",
  no_data: "neutral",
};

const views = {
  loading: document.getElementById("loading-view"),
  connect: document.getElementById("connect-view"),
  main: document.getElementById("main-view"),
};

function showView(name) {
  Object.entries(views).forEach(([key, el]) => el.classList.toggle("hidden", key !== name));
}

document.getElementById("open-app").addEventListener("click", (e) => {
  e.preventDefault();
  chrome.tabs.create({ url: `${API_BASE}/app` });
});

// --- Connect flow -----------------------------------------------------

const tokenInput = document.getElementById("token-input");
const connectBtn = document.getElementById("connect-btn");
const connectError = document.getElementById("connect-error");

// The connect page on mindthefit.com hands the code to connect.js, which
// saves it -- this popup closes when the tab opens, so the next click on the
// toolbar icon finds the extension connected.
document.getElementById("signin-btn").addEventListener("click", () => {
  chrome.tabs.create({ url: `${API_BASE}/connect/extension` });
  window.close();
});

// Signing in (here or on the connect page) and signing out both go through
// storage, so this one listener keeps the popup in step.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local" || !changes[TOKEN_KEY]) return;
  token = changes[TOKEN_KEY].newValue || null;
  if (token) {
    showView("main");
    checkCurrentPage();
  } else {
    showView("connect");
  }
});

connectBtn.addEventListener("click", async () => {
  const code = tokenInput.value.trim();
  connectError.classList.add("hidden");
  if (!code) {
    connectError.textContent = "Paste the code from Settings first.";
    connectError.classList.remove("hidden");
    return;
  }
  await chrome.storage.local.set({ [TOKEN_KEY]: code });
});

document.getElementById("disconnect-btn").addEventListener("click", async () => {
  // Revoke it on the server too, so it doesn't linger in Settings → Connections.
  if (token) {
    fetch(`${API_BASE}/api/extension/disconnect`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {});
  }
  tokenInput.value = "";
  await chrome.storage.local.remove(TOKEN_KEY);
});

// --- Check-the-fit flow -------------------------------------------------

const statusEl = document.getElementById("status");
const statusText = document.getElementById("status-text");
const notListingEl = document.getElementById("not-listing");
const retryBtn = document.getElementById("retry-btn");
const usageNote = document.getElementById("usage-note");
const resultEl = document.getElementById("result");
const mainError = document.getElementById("main-error");

function setMainError(message) {
  if (message) {
    mainError.textContent = message;
    mainError.classList.remove("hidden");
  } else {
    mainError.classList.add("hidden");
  }
}

function setStatus(text) {
  statusText.textContent = text || "";
  statusEl.classList.toggle("hidden", !text);
}

function resetMain() {
  setStatus(null);
  setMainError(null);
  notListingEl.classList.add("hidden");
  retryBtn.classList.add("hidden");
  resultEl.classList.add("hidden");
}

function timeAgo(iso) {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days <= 0) return "earlier today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  return `on ${new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
}

// Same synthesis as lib/fit.ts's summarizeVerdict, kept in sync by hand --
// small and stable enough that duplicating it here beats a build step.
function summarize(verdicts) {
  const withData = verdicts.filter((v) => v.reading !== "no_data");
  if (withData.length === 0) {
    return { headline: "Not enough measurements yet to say how this will fit.", tone: "neutral" };
  }
  const tight = withData.filter((v) => v.reading === "tight").map((v) => v.dimension);
  const loose = withData.filter((v) => v.reading === "loose").map((v) => v.dimension);
  const join = (d) => (d.length <= 1 ? d.join("") : `${d.slice(0, -1).join(", ")} and ${d[d.length - 1]}`);

  if (tight.length === 0 && loose.length === 0) {
    return { headline: "Looks like a good fit overall.", tone: "good" };
  }
  if (tight.length > 0 && loose.length > 0) {
    return {
      headline: `Mixed fit — snug through the ${join(tight)}, loose through the ${join(loose)}.`,
      tone: "warn",
    };
  }
  if (tight.length > 0) {
    return { headline: `Will likely run tight through the ${join(tight)}.`, tone: "warn" };
  }
  return { headline: `Will likely run loose through the ${join(loose)}.`, tone: "warn" };
}

function formatInches(n) {
  return Number.isInteger(n) ? `${n}"` : `${n.toFixed(1)}"`;
}

function formatEase(ease) {
  if (ease == null) return "";
  const abs = formatInches(Math.abs(ease));
  return ease >= 0 ? `${abs} of room` : `${abs} short`;
}

function renderResult(data, { checkedAt } = {}) {
  resultEl.classList.remove("hidden");
  const { result, verdict = [] } = data;
  const overall = summarize(verdict);
  const brandLine = result.brand ? `${result.brand} — ` : "";

  const rows = verdict
    .map((v) => {
      const detail =
        v.reading === "no_data"
          ? ""
          : `<p class="dim-detail">${formatInches(v.garment)} garment vs your ${formatInches(
              v.body
            )} — ${formatEase(v.ease)}</p>`;
      return `
        <div class="result-dim">
          <div class="result-dim-head">
            <span class="dim">${v.dimension}</span>
            <span class="reading-badge tone-${READING_TONE[v.reading]}">${READING_LABEL[v.reading]}</span>
          </div>
          ${detail}
        </div>`;
    })
    .join("");

  const imagesNote =
    data.imagesUnreadable > 0
      ? `<p class="muted">Read ${data.imagesUsed} photo${data.imagesUsed === 1 ? "" : "s"} from this page — ${
          data.imagesUnreadable
        } couldn't be captured. The listing text usually covers it, but a screenshot uploaded from mindthefit.com works too.</p>`
      : "";

  const photoNote = result.measuredFromPhoto
    ? `<p class="photo-note">★ Filled in from a photo, not the listing text — worth a glance yourself.</p>`
    : "";

  const landing = data.landing
    ? `<div class="landing">
        <p class="landing-label">${data.landing.label}</p>
        <p class="landing-detail">${data.landing.detail}</p>
      </div>`
    : "";

  // An earlier check of this same listing, re-scored against today's
  // measurements -- re-reading it would spend another check, so it's opt-in.
  const earlierNote = checkedAt
    ? `<p class="checked-before">You checked this listing ${timeAgo(checkedAt)}. <a href="#" id="check-again-link">Check again</a></p>`
    : "";

  resultEl.innerHTML = `
    ${earlierNote}
    <p class="result-title">${brandLine}${result.garmentType || "item"}</p>
    <p class="result-headline tone-${overall.tone}">${overall.headline}</p>
    ${result.summary ? `<p class="muted">${result.summary}</p>` : ""}
    ${photoNote}
    ${rows}
    ${landing}
    ${result.fitNotes ? `<p class="muted">${result.fitNotes}</p>` : ""}
    ${imagesNote}
    <a class="result-link" href="#" id="view-history-link">View full details in your history →</a>
  `;
  document.getElementById("view-history-link").addEventListener("click", (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: `${API_BASE}/app/history` });
  });
  document.getElementById("check-again-link")?.addEventListener("click", (e) => {
    e.preventDefault();
    runCheck();
  });

  if (data.usage && data.usage.checksRemaining !== null) {
    usageNote.textContent = `${data.usage.checksRemaining} free checks left this month`;
    usageNote.classList.remove("hidden");
  } else {
    usageNote.classList.add("hidden");
  }
}

// Runs inside the page. Every check that reads something counts against the
// free plan, so opening the popup only checks automatically on pages that
// look like a product listing: the site's own product markup, or a resale
// site's item-page address.
function looksLikeListing() {
  const productMarkup = Array.from(document.querySelectorAll('script[type="application/ld+json"]')).some((s) =>
    /"@type"\s*:\s*(\[[^\]]*)?"Product"/.test(s.textContent || "")
  );
  const ogType = document.querySelector('meta[property="og:type"]')?.getAttribute("content") || "";
  const priceMeta = !!document.querySelector(
    'meta[property="product:price:amount"], meta[property="og:price:amount"], [itemprop="price"]'
  );
  const itemPath = /\/(listing|listings|product|products|item|items|itm)\/|\.shtml$/i.test(location.pathname);
  return productMarkup || /product/i.test(ogType) || priceMeta || itemPath;
}

// Runs inside the page itself (not the extension) -- this is the whole
// point: it reads what the user's own browser already rendered, which is
// exactly what a server-side fetch of the same URL can't do on a site that
// blocks automated requests.
async function extractPageData() {
  function drawResized(imgEl, maxDim, quality) {
    const scale = Math.min(1, maxDim / Math.max(imgEl.naturalWidth, imgEl.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(imgEl.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(imgEl.naturalHeight * scale));
    canvas.getContext("2d").drawImage(imgEl, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", quality); // throws if the canvas is tainted
  }

  // A fresh same-src Image loaded WITH crossOrigin set can read cleanly off
  // canvas even when the page's own <img> (loaded without it) would taint --
  // many CDNs allow anonymous CORS for images without the page opting in.
  function loadWithCors(src) {
    return new Promise((resolve, reject) => {
      const probe = new Image();
      probe.crossOrigin = "anonymous";
      probe.onload = () => resolve(probe);
      probe.onerror = reject;
      probe.src = src;
    });
  }

  const text = (document.body.innerText || "").trim().slice(0, 8000);

  // Real-world check against a ThredUp listing showed two things naturalWidth
  // sorting alone gets wrong: (1) a page can have a small on-screen image
  // (e.g. a QR code) with huge natural/source resolution that would
  // outrank the actual product photo -- rendered on-screen size is the
  // signal that matches visual prominence, not source resolution; (2) a
  // product's OTHER photos (e.g. a measurement diagram later in the
  // carousel) are often already fully loaded as real <img> elements, just
  // small (ThredUp's own thumbnail rail renders at ~80px) -- a 200px floor
  // discarded those entirely, which is why only the currently-focused photo
  // ever got read.
  const MIN_DIM = 50; // above real UI icons (~14-24px seen), below real thumbnails (~77px seen)
  const renderedArea = (img) => {
    const r = img.getBoundingClientRect();
    return r.width * r.height;
  };

  const loaded = Array.from(document.querySelectorAll("img")).filter(
    (img) => img.naturalWidth >= MIN_DIM && img.naturalHeight >= MIN_DIM
  );

  // Scope to the gallery/carousel region when we can find one, so small
  // thumbnails from an unrelated "you might also like" grid elsewhere on
  // the page don't dilute the pool -- walk up from the most prominently
  // rendered image until a container holds several qualifying images
  // (the gallery + its thumbnail rail), falling back to the whole page.
  let pool = loaded;
  if (loaded.length > 0) {
    const hero = loaded.reduce((a, b) => (renderedArea(a) >= renderedArea(b) ? a : b));
    let node = hero;
    for (let i = 0; i < 6 && node.parentElement; i++) {
      node = node.parentElement;
      const within = Array.from(node.querySelectorAll("img")).filter(
        (img) => img.naturalWidth >= MIN_DIM && img.naturalHeight >= MIN_DIM
      );
      if (within.length >= 3) {
        pool = within;
        break;
      }
    }
  }

  const candidates = pool.sort((a, b) => renderedArea(b) - renderedArea(a)).slice(0, 20);

  const seen = new Set();
  const images = [];
  const thumbnails = [];
  const failedImageUrls = [];
  const MAX_ATTEMPTS = 8; // some CDNs (confirmed: ThredUp) block canvas capture on
  // every image, not just the odd tainted one -- cap total attempts, not just
  // successes, so a fully-blocked CDN doesn't burn time retrying CORS on all
  // 20 candidates before falling through to the server-side URL fallback.

  for (const img of candidates) {
    if (images.length + failedImageUrls.length >= MAX_ATTEMPTS) break;
    const src = img.currentSrc || img.src;
    if (!src || seen.has(src)) continue;
    seen.add(src);

    try {
      images.push(drawResized(img, 1024, 0.85));
      thumbnails.push(drawResized(img, 240, 0.6));
      continue;
    } catch {
      // Tainted canvas -- try once more via a CORS-mode reload below.
    }

    try {
      const corsImg = await loadWithCors(src);
      images.push(drawResized(corsImg, 1024, 0.85));
      thumbnails.push(drawResized(corsImg, 240, 0.6));
    } catch {
      // Still no good -- hand the bare URL back so the server can try a
      // direct fetch (image CDNs are often unprotected even when the page
      // itself blocks automated requests).
      failedImageUrls.push(src);
    }
  }

  return { text, images, thumbnails, failedImageUrls, url: location.href };
}

function dataUrlToPart(dataUrl) {
  const match = dataUrl.match(/^data:(.*);base64,(.*)$/);
  if (!match) return null;
  return { mimeType: match[1], base64: match[2] };
}

class SignedOut extends Error {}

async function api(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) {
    // Signed out or disconnected elsewhere -- send them back through sign-in.
    await chrome.storage.local.remove(TOKEN_KEY);
    showView("connect");
    throw new SignedOut();
  }
  if (!res.ok) throw new Error(data.error || "Couldn't check this listing.");
  return data;
}

function showFailure(err, retry) {
  if (err instanceof SignedOut) return;
  setStatus(null);
  setMainError(err instanceof Error ? err.message : "Something went wrong.");
  retryAction = retry;
  retryBtn.classList.remove("hidden");
}

// A check that's still running when the popup closes (a click anywhere on the
// page closes it) keeps going on the server and lands in history. This marker
// lets the next popup wait for that result instead of paying for a second
// check of the same listing.
const PENDING_MAX_MS = 120000;
const pendingKey = (url) => `pending:${url.split(/[?#]/)[0].replace(/\/+$/, "").toLowerCase()}`;

async function readPage(func) {
  try {
    const [{ result }] = await chrome.scripting.executeScript({ target: { tabId: currentTab.id }, func });
    return result;
  } catch {
    throw new Error("Chrome doesn't let extensions read this page. Open a listing and try again.");
  }
}

// Opening the popup is the request to check: show an earlier result for this
// listing if there is one, otherwise check it right away.
async function checkCurrentPage() {
  resetMain();
  if (!currentTab?.id || !/^https?:/.test(currentTab.url || "")) {
    setMainError("Open a listing, then click Mind the Fit.");
    return;
  }
  try {
    setStatus("Looking for this listing…");
    const earlier = await api("/api/extension/earlier", { url: currentTab.url });
    if (earlier.found) {
      setStatus(null);
      renderResult(earlier, { checkedAt: earlier.checkedAt });
      return;
    }

    const key = pendingKey(currentTab.url);
    const { [key]: startedAt } = await chrome.storage.session.get(key);
    if (startedAt && Date.now() - startedAt < PENDING_MAX_MS) {
      await waitForUnfinishedCheck(startedAt);
      return;
    }

    if (!(await readPage(looksLikeListing))) {
      setStatus(null);
      notListingEl.classList.remove("hidden");
      return;
    }
    await runCheck();
  } catch (err) {
    showFailure(err, checkCurrentPage);
  }
}

async function waitForUnfinishedCheck(startedAt) {
  setStatus("Still checking this listing…");
  while (Date.now() - startedAt < PENDING_MAX_MS) {
    await new Promise((resolve) => setTimeout(resolve, 3000));
    const earlier = await api("/api/extension/earlier", { url: currentTab.url });
    if (earlier.found) {
      setStatus(null);
      renderResult(earlier);
      await chrome.storage.session.remove(pendingKey(currentTab.url));
      return;
    }
  }
  await chrome.storage.session.remove(pendingKey(currentTab.url));
  throw new Error("That check didn't finish.");
}

async function runCheck() {
  resetMain();
  const key = pendingKey(currentTab.url);
  await chrome.storage.session.set({ [key]: Date.now() });
  try {
    setStatus("Reading the page…");
    const page = await readPage(extractPageData);
    if (!page.text && page.images.length === 0 && page.failedImageUrls.length === 0) {
      throw new Error("Didn't find any listing text or photos on this page.");
    }

    setStatus("Checking the fit…");
    const data = await api("/api/extension/extract", {
      sourceUrl: page.url,
      pageText: page.text,
      images: page.images.map(dataUrlToPart).filter(Boolean),
      thumbnails: page.thumbnails,
      imageUrls: page.failedImageUrls,
    });
    setStatus(null);
    renderResult(data);
  } catch (err) {
    showFailure(err, runCheck);
  } finally {
    await chrome.storage.session.remove(key);
  }
}

document.getElementById("check-anyway-btn").addEventListener("click", () => runCheck());
retryBtn.addEventListener("click", () => retryAction?.());

// --- Init -----------------------------------------------------------------

(async function init() {
  ({ [TOKEN_KEY]: token } = await chrome.storage.local.get(TOKEN_KEY));
  if (!token) {
    showView("connect");
    return;
  }
  showView("main");
  [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  checkCurrentPage();
})();
