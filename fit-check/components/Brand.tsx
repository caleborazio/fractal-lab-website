// The wordmark (option C2-2: light caps, snug spacing, an italic "the" tucked
// between) and the MtF mark used for icons. Size both with a text-* class.

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`whitespace-nowrap font-display font-normal tracking-[0.02em] ${className}`}>
      MIND<em className="ml-[0.08em] mr-[0.12em] text-[0.74em] tracking-normal">the</em>FIT
    </span>
  );
}

export function Mark({ size = 32, className = "" }: { size?: number; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center border border-ink/25 bg-bg font-display font-medium text-ink ${className}`}
      style={{ width: size, height: size, borderRadius: size * 0.22, fontSize: size * 0.5 }}
    >
      M<em className="text-[0.72em] font-normal">t</em>F
    </span>
  );
}
