// Runs only on mindthefit.com/connect/extension. When the person taps Connect
// there, the page creates a connection code and posts it here; this saves it
// for the popup, so nobody has to copy and paste a code.
const FROM_SITE = "mind-the-fit-site";
const FROM_EXTENSION = "mind-the-fit-extension";
const TOKEN_KEY = "mtf_token";
const ext = globalThis.browser ?? globalThis.chrome;

function reply(type, extra = {}) {
  window.postMessage({ source: FROM_EXTENSION, type, ...extra }, location.origin);
}

// "ready" also says whether this browser is already signed in, so the page
// doesn't make another connection just because it was opened again.
async function announce() {
  const { [TOKEN_KEY]: token } = await ext.storage.local.get(TOKEN_KEY);
  reply("ready", { connected: !!token });
}

window.addEventListener("message", async (event) => {
  // Only the page itself (same window, same origin) can hand over a code.
  if (event.source !== window || event.origin !== location.origin) return;
  const data = event.data;
  if (!data || data.source !== FROM_SITE) return;

  if (data.type === "hello") announce();
  if (data.type === "connect" && typeof data.code === "string" && data.code.startsWith("mtf_")) {
    await ext.storage.local.set({ [TOKEN_KEY]: data.code });
    reply("connected");
  }
});

announce();
