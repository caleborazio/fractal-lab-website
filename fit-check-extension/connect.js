// Runs only on mindthefit.com/connect/extension. When the person taps Connect
// there, the page creates a connection code and posts it here; this saves it
// for the popup, so nobody has to copy and paste a code.
const FROM_SITE = "mind-the-fit-site";
const FROM_EXTENSION = "mind-the-fit-extension";
const TOKEN_KEY = "mtf_token";

function reply(type) {
  window.postMessage({ source: FROM_EXTENSION, type }, location.origin);
}

window.addEventListener("message", async (event) => {
  // Only the page itself (same window, same origin) can hand over a code.
  if (event.source !== window || event.origin !== location.origin) return;
  const data = event.data;
  if (!data || data.source !== FROM_SITE) return;

  if (data.type === "hello") reply("ready");
  if (data.type === "connect" && typeof data.code === "string" && data.code.startsWith("mtf_")) {
    await chrome.storage.local.set({ [TOKEN_KEY]: data.code });
    reply("connected");
  }
});

reply("ready");
