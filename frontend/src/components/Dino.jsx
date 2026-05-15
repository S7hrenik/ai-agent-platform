export default function Dino({ running = false, size = 48 }) {
  const h = Math.round(size * 1.15);
  return (
    <svg
      viewBox="0 0 52 60"
      width={size}
      height={h}
      className={`dino${running ? " dino-running" : ""}`}
      aria-hidden="true"
      fill="currentColor"
    >
      {/* Tail */}
      <polygon points="0,36 13,26 13,33" />

      {/* Body */}
      <rect x="9" y="18" width="26" height="16" rx="3" />

      {/* Neck */}
      <rect x="23" y="8" width="10" height="12" rx="2" />

      {/* Head */}
      <rect x="18" y="0" width="24" height="14" rx="3" />

      {/* Snout */}
      <rect x="38" y="6" width="9" height="8" rx="2" />

      {/* Eye */}
      <circle cx="29" cy="6" r="3" fill="white" />
      <circle cx="30" cy="6" r="1.6" fill="#334155" />

      {/* Tiny arm */}
      <rect x="27" y="30" width="7" height="5" rx="1" />

      {/* Back leg — rotates from top */}
      <g className="dino-leg-back">
        <rect x="11" y="34" width="6" height="16" rx="2" />
        <rect x="9" y="48" width="10" height="5" rx="2" />
      </g>

      {/* Front leg — rotates from top */}
      <g className="dino-leg-front">
        <rect x="20" y="34" width="6" height="16" rx="2" />
        <rect x="20" y="48" width="10" height="5" rx="2" />
      </g>
    </svg>
  );
}
