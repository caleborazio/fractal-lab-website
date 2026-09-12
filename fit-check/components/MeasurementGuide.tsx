export function MeasurementGuide() {
  return (
    <div className="mb-5 flex items-start gap-4 rounded border border-line bg-panel p-4">
      <svg
        viewBox="0 0 160 300"
        className="h-44 w-24 flex-shrink-0 text-ink-faint"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        aria-hidden="true"
      >
        {/* head */}
        <circle cx="80" cy="22" r="15" />
        {/* neck */}
        <line x1="80" y1="37" x2="80" y2="46" />
        {/* body outline: shoulders -> torso -> hips -> legs -> feet */}
        <path d="M48 54 Q80 45 112 54 L120 118 Q114 148 120 172 L110 244 L94 244 L90 172 L70 172 L66 244 L50 244 L40 172 Q46 148 40 118 Z" />
        {/* arms */}
        <path d="M48 54 L32 130 L37 140" />
        <path d="M112 54 L128 130 L123 140" />
        {/* feet */}
        <line x1="94" y1="244" x2="98" y2="253" />
        <line x1="50" y1="244" x2="46" y2="253" />

        {/* bust line */}
        <line x1="14" y1="82" x2="146" y2="82" strokeDasharray="4 3" className="text-accent" />
        {/* waist line */}
        <line x1="14" y1="132" x2="146" y2="132" strokeDasharray="4 3" className="text-pine" />
        {/* hip line */}
        <line x1="14" y1="168" x2="146" y2="168" strokeDasharray="4 3" className="text-accent" />
      </svg>
      <div className="flex flex-col gap-2.5 text-xs leading-relaxed text-ink-soft">
        <p>
          <strong className="text-accent">Bust</strong> — fullest part of your chest, tape level
          front-to-back, arms relaxed at your sides (raising them shrinks the number).
        </p>
        <p>
          <strong className="text-pine">Waist</strong> — bend to one side; the crease that forms is
          your natural waist. Breathe normally, don&apos;t suck in.
        </p>
        <p>
          <strong className="text-accent">Hip</strong> — fullest part of your hips/seat, usually
          8–9&quot; below your waist — check visually rather than measuring blind at that distance.
        </p>
      </div>
    </div>
  );
}
