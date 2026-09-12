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
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {/* head + neck */}
        <circle cx="80" cy="18" r="13" />
        <line x1="80" y1="31" x2="80" y2="42" />

        {/* torso + legs, one smooth outline */}
        <path
          d="M48,50 L112,50
             C120,64 120,72 120,84
             C120,104 110,120 98,134
             C110,148 116,158 116,170
             L102,172 L102,250 L84,250 L84,192 L72,192 L72,250 L54,250 L54,172
             L40,170
             C40,158 46,148 58,134
             C46,120 36,104 36,84
             C36,72 36,64 48,50
             Z"
        />

        {/* arms */}
        <path d="M48,50 C36,70 32,95 36,122 C38,132 40,140 42,147" />
        <path d="M112,50 C124,70 128,95 124,122 C122,132 120,140 118,147" />

        {/* feet */}
        <line x1="84" y1="250" x2="88" y2="259" />
        <line x1="54" y1="250" x2="50" y2="259" />

        {/* bust line */}
        <line x1="14" y1="82" x2="146" y2="82" strokeDasharray="4 3" className="text-accent" />
        {/* waist line */}
        <line x1="14" y1="133" x2="146" y2="133" strokeDasharray="4 3" className="text-pine" />
        {/* hip line */}
        <line x1="14" y1="171" x2="146" y2="171" strokeDasharray="4 3" className="text-accent" />
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
