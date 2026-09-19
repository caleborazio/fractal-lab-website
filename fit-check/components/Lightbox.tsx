"use client";

/** Full-screen click-to-close image viewer, shared by the live check flow
 * and history -- the whole point is letting someone zoom in on a tape-measure
 * shot or a tag to double-check a read themselves. */
export function Lightbox({ src, onClose }: { src: string | null; onClose: () => void }) {
  if (!src) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex cursor-zoom-out items-center justify-center bg-black/80 p-6"
    >
      <img
        src={src}
        alt="enlarged"
        className="max-h-full max-w-full rounded object-contain"
      />
      <button
        onClick={onClose}
        aria-label="Close"
        className="absolute right-5 top-5 rounded-full bg-bg px-3 py-1.5 text-sm text-ink hover:bg-panel"
      >
        Close
      </button>
    </div>
  );
}
