// Store listings for each place Mind the Fit installs. Paste a listing's URL
// here once it's live and the install buttons on /get point straight to it;
// until then that section says it's coming and shows how to set it up from
// the source instead.
export const STORE_LINKS: Record<InstallTarget, string | null> = {
  chrome: null, // Chrome Web Store listing (also covers Edge, Brave, Arc)
  macSafari: null, // Mac App Store listing for the Mind the Fit Mac app
  iphone: null, // App Store listing for the iPhone app
};

export type InstallTarget = "chrome" | "macSafari" | "iphone";

/** Which install to lead with for the browser this page was opened in. */
export function installTargetFor(userAgent: string): InstallTarget | null {
  if (/iPhone|iPad|iPod/.test(userAgent)) return "iphone";
  // Chrome on Android reports itself as Chrome but can't run extensions.
  if (/Android/.test(userAgent)) return null;
  // Edge, Brave and Arc all install from the Chrome Web Store too.
  if (/Chrome\/|Chromium\/|Edg\//.test(userAgent)) return "chrome";
  if (/Macintosh/.test(userAgent) && /Safari\//.test(userAgent)) return "macSafari";
  return null;
}
