const API_BASE = "https://www.mindthefit.com";
const TOKEN_KEY = "mtf_token";

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

connectBtn.addEventListener("click", async () => {
  const token = tokenInput.value.trim();
  connectError.classList.add("hidden");
  if (!token) {
    connectError.textContent = "Paste the code from Settings first.";
    connectError.classList.remove("hidden");
    return;
  }
  await chrome.storage.local.set({ [TOKEN_KEY]: token });
  showView("main");
});

document.getElementById("disconnect-btn").addEventListener("click", async () => {
  await chrome.storage.local.remove(TOKEN_KEY);
  tokenInput.value = "";
  showView("connect");
});

// --- Check-the-fit flow -------------------------------------------------

const checkBtn = document.getElementById("check-btn");
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

function renderResult(data) {
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

  resultEl.innerHTML = `
    <p class="result-title">${brandLine}${result.garmentType || "item"}</p>
    <p class="result-headline tone-${overall.tone}">${overall.headline}</p>
    ${result.summary ? `<p class="muted">${result.summary}</p>` : ""}
    ${photoNote}
    ${rows}
    ${result.fitNotes ? `<p class="muted">${result.fitNotes}</p>` : ""}
    ${imagesNote}
    <a class="result-link" href="#" id="view-history-link">View full details in your history →</a>
  `;
  document.getElementById("view-history-link").addEventListener("click", (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: `${API_BASE}/app/history` });
  });

  if (data.usage && data.usage.checksRemaining !== null) {
    usageNote.textContent = `${data.usage.checksRemaining} free checks left this month`;
    usageNote.classList.remove("hidden");
  } else {
    usageNote.classList.add("hidden");
  }
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

  // Prioritize the largest images on the page, not the first ones in DOM
  // order -- a real product/diagram photo is almost always one of the
  // biggest images on the page, while nav logos, icons, and "you might also
  // like" thumbnails elsewhere are small. DOM order can put those first and
  // push the actual listing photos (especially a later one in a carousel,
  // e.g. a measurement diagram a few photos in) past a small candidate cap.
  const candidates = Array.from(document.querySelectorAll("img"))
    .filter((img) => img.naturalWidth >= 200 && img.naturalHeight >= 200)
    .sort((a, b) => b.naturalWidth * b.naturalHeight - a.naturalWidth * a.naturalHeight)
    .slice(0, 20);

  const seen = new Set();
  const images = [];
  const thumbnails = [];
  const failedImageUrls = [];

  for (const img of candidates) {
    if (images.length >= 8) break;
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

checkBtn.addEventListener("click", async () => {
  setMainError(null);
  resultEl.classList.add("hidden");
  checkBtn.disabled = true;
  checkBtn.textContent = "Reading the page…";

  try {
    const { [TOKEN_KEY]: token } = await chrome.storage.local.get(TOKEN_KEY);
    if (!token) {
      showView("connect");
      return;
    }

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) throw new Error("Couldn't find the current tab.");

    const [{ result: page }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: extractPageData,
    });

    if (!page.text && page.images.length === 0 && page.failedImageUrls.length === 0) {
      throw new Error("Didn't find any listing text or photos on this page.");
    }

    checkBtn.textContent = "Checking the fit…";

    const res = await fetch(`${API_BASE}/api/extension/extract`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        sourceUrl: page.url,
        pageText: page.text,
        images: page.images.map(dataUrlToPart).filter(Boolean),
        thumbnails: page.thumbnails,
        imageUrls: page.failedImageUrls,
      }),
    });
    const data = await res.json();

    if (res.status === 401) {
      // Token was revoked/regenerated elsewhere -- send them back through connect.
      await chrome.storage.local.remove(TOKEN_KEY);
      showView("connect");
      return;
    }
    if (!res.ok) throw new Error(data.error || "Couldn't check this listing.");

    renderResult(data);
  } catch (err) {
    setMainError(err instanceof Error ? err.message : "Something went wrong.");
  } finally {
    checkBtn.disabled = false;
    checkBtn.textContent = "Check the fit";
  }
});

// --- Init -----------------------------------------------------------------

(async function init() {
  const { [TOKEN_KEY]: token } = await chrome.storage.local.get(TOKEN_KEY);
  showView(token ? "main" : "connect");
})();
