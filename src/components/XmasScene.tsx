/** December decoration for the tray mini calendar: tree, bears, gifts and fireworks. */
const BURSTS = [
  { x: 52, y: 26, color: "#e53935", delay: "0s" },
  { x: 170, y: 18, color: "#fbc02d", delay: "-1.1s" },
  { x: 288, y: 28, color: "#1e88e5", delay: "-2.2s" },
];

function Burst({ x, y, color, delay }: (typeof BURSTS)[number]) {
  return (
    <g className="firework" style={{ animationDelay: delay, transformOrigin: `${x}px ${y}px` }}>
      {Array.from({ length: 10 }, (_, i) => {
        const angle = (i * 36 * Math.PI) / 180;
        return (
          <line
            key={i}
            x1={x + Math.cos(angle) * 5}
            y1={y + Math.sin(angle) * 5}
            x2={x + Math.cos(angle) * 15}
            y2={y + Math.sin(angle) * 15}
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
          />
        );
      })}
      <circle cx={x} cy={y} r="2.5" fill={color} />
    </g>
  );
}

function Bear({ x, scarf }: { x: number; scarf: string }) {
  return (
    <g transform={`translate(${x} 0)`}>
      <circle cx="-9" cy="64" r="4.5" fill="#a9703f" />
      <circle cx="9" cy="64" r="4.5" fill="#a9703f" />
      <ellipse cx="0" cy="84" rx="12" ry="11" fill="#b9814c" />
      <circle cx="0" cy="68" r="11" fill="#c28a54" />
      <ellipse cx="0" cy="72" rx="5" ry="4" fill="#e8c9a0" />
      <circle cx="-4" cy="66" r="1.4" fill="#2d2a26" />
      <circle cx="4" cy="66" r="1.4" fill="#2d2a26" />
      <circle cx="0" cy="71" r="1.6" fill="#2d2a26" />
      <path d="M-9 76 Q0 82 9 76 L9 80 Q0 86 -9 80Z" fill={scarf} />
      <path d="M-14 62 L-6 56 L0 61 L6 56 L14 62 L10 66 Q0 56 -10 66Z" fill="#d6403a" opacity="0.95" />
    </g>
  );
}

export function XmasScene() {
  return (
    <svg className="mini-xmas-scene" viewBox="0 0 340 100" role="img" aria-hidden="true">
      {BURSTS.map((burst) => (
        <Burst key={burst.x} {...burst} />
      ))}

      {/* tree */}
      <g transform="translate(170 0)">
        <polygon points="0,34 -22,62 22,62" fill="#2e9e5b" />
        <polygon points="0,46 -28,76 28,76" fill="#278a4f" />
        <polygon points="0,58 -34,90 34,90" fill="#1f7a43" />
        <rect x="-5" y="90" width="10" height="8" fill="#7a4b2a" />
        <polygon points="0,26 3,33 11,34 5,39 7,47 0,43 -7,47 -5,39 -11,34 -3,33" fill="#fbc02d" />
        <circle cx="-8" cy="60" r="2.8" fill="#e53935" />
        <circle cx="9" cy="70" r="2.8" fill="#1e88e5" />
        <circle cx="-14" cy="80" r="2.8" fill="#fbc02d" />
        <circle cx="4" cy="83" r="2.8" fill="#e53935" />
        <circle cx="16" cy="84" r="2.8" fill="#fbc02d" />
        <circle cx="-3" cy="50" r="2.4" fill="#fbc02d" />
      </g>

      {/* bears */}
      <Bear x={104} scarf="#e53935" />
      <Bear x={236} scarf="#1e88e5" />

      {/* gifts */}
      <g>
        <rect x="132" y="82" width="20" height="16" rx="2" fill="#e53935" />
        <rect x="140" y="82" width="4" height="16" fill="#fbc02d" />
        <rect x="132" y="88" width="20" height="3.5" fill="#fbc02d" />
        <rect x="190" y="86" width="22" height="12" rx="2" fill="#1e88e5" />
        <rect x="199" y="86" width="4" height="12" fill="#fff" opacity="0.85" />
        <rect x="262" y="84" width="16" height="14" rx="2" fill="#43a047" />
        <rect x="268" y="84" width="4" height="14" fill="#fbc02d" />
        <rect x="68" y="86" width="16" height="12" rx="2" fill="#8e24aa" />
        <rect x="74" y="86" width="4" height="12" fill="#fff" opacity="0.85" />
      </g>
    </svg>
  );
}
