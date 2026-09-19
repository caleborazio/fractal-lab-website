const API_BASE = "https://www.mindthefit.com";
const TOKEN_KEY = "mtf_token";

const READING_LABEL = {
  tight: "Will be tight",
  fitted: "Fitted, true to size",
  comfortable: "Comfortable, room to move",
  loose: "Loose / oversized",
  no_data: "No measurement to compare",
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

function renderResult(data) {
  resultEl.classList.remove("hidden");
  const brandLine = data.result.brand ? `${data.result.brand} — ` : "";
  const rows = (data.verdict || [])
    .map(
      (v) =>
        `<div class="result-row"><span class="dim">${v.dimension}</span><span class="reading">${
          READING_LABEL[v.reading] || v.reading
        }</span></div>`
    )
    .join("");

  resultEl.innerHTML = `
    <p class="result-title">${brandLine}${data.result.garmentType || "item"}</p>
    ${rows}
    <a class="result-link" href="#" id="view-history-link">View in your history →</a>
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
function extractPageData() {
  function drawResized(img, maxDim, quality) {
    const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
    canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", quality);
  }

  const text = (document.body.innerText || "").trim().slice(0, 8000);

  const candidates = Array.from(document.querySelectorAll("img"))
    .filter((img) => img.naturalWidth >= 200 && img.naturalHeight >= 200)
    .slice(0, 12);

  const seen = new Set();
  const images = [];
  const thumbnails = [];
  for (const img of candidates) {
    if (images.length >= 6) break;
    const src = img.currentSrc || img.src;
    if (!src || seen.has(src)) continue;
    seen.add(src);
    try {
      images.push(drawResized(img, 1024, 0.85));
      thumbnails.push(drawResized(img, 240, 0.6));
    } catch {
      // Cross-origin image the page didn't serve with permissive CORS --
      // can't read it off a canvas. Skip it; the page text usually carries
      // the measurements anyway.
    }
  }

  return { text, images, thumbnails, url: location.href };
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

    if (!page.text && page.images.length === 0) {
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
