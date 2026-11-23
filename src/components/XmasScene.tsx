/** December header art for the tray mini calendar: tree, bears, gifts and
 *  fireworks, painted in the same soft vintage palette as the other banners. */
const BURSTS = [
  { x: 48, y: 30, color: "#c9524a", delay: "0s" },
  { x: 132, y: 20, color: "#d9a43a", delay: "-1.1s" },
  { x: 214, y: 34, color: "#5f84a0", delay: "-2.2s" },
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
            x2={x + Math.cos(angle) * 14}
            y2={y + Math.sin(angle) * 14}
            stroke={color}
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        );
      })}
      <circle cx={x} cy={y} r="2.2" fill={color} />
    </g>
  );
}

function Bear({ x, scarf }: { x: number; scarf: string }) {
  // Drawn around (0, 0) at the feet; ~26px tall.
  return (
    <g transform={`translate(${x} 124) scale(0.72)`}>
      <circle cx="-8" cy="-30" r="4.2" fill="#a9703f" />
      <circle cx="8" cy="-30" r="4.2" fill="#a9703f" />
      <ellipse cx="0" cy="-10" rx="11" ry="10" fill="#b9814c" />
      <circle cx="0" cy="-26" r="10.5" fill="#c28a54" />
      <ellipse cx="0" cy="-22" rx="4.6" ry="3.6" fill="#ead2ae" />
      <circle cx="-3.8" cy="-28" r="1.3" fill="#3a332b" />
      <circle cx="3.8" cy="-28" r="1.3" fill="#3a332b" />
      <circle cx="0" cy="-23" r="1.5" fill="#3a332b" />
      <path d="M-8 -17 Q0 -12 8 -17 L8 -13 Q0 -8 -8 -13Z" fill={scarf} />
      <path d="M-13 -33 L-5 -39 L0 -34 L5 -39 L13 -33 L9 -30 Q0 -40 -9 -30Z" fill="#c9524a" />
    </g>
  );
}

export function XmasScene() {
  return (
    <svg className="mini-xmas-scene" viewBox="0 0 340 134" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      {BURSTS.map((burst) => (
        <Burst key={burst.x} {...burst} />
      ))}

      <g transform="translate(0 -24)">
      {/* pine sprig with berries, like the botanical banners */}
      <g stroke="#6f8a68" strokeWidth="1.6" strokeLinecap="round" fill="none" opacity="0.8">
        <path d="M4 60 Q40 48 84 54" />
        <path d="M24 54 l-6 -8 M40 52 l-5 -9 M58 51 l-4 -9 M74 52 l-3 -8" />
        <path d="M24 54 l-6 7 M40 52 l-5 8 M58 51 l-4 8 M74 52 l-3 7" />
      </g>
      <circle cx="30" cy="57" r="2.4" fill="#c9524a" />
      <circle cx="47" cy="54" r="2.4" fill="#c9524a" />

      {/* tree */}
      <g>
        <polygon points="300,46 280,76 320,76" fill="#6f9a78" />
        <polygon points="300,60 274,94 326,94" fill="#5d8a69" />
        <polygon points="300,76 268,114 332,114" fill="#4c7a5a" />
        <rect x="296" y="114" width="8" height="10" fill="#8a5a3a" />
        <polygon points="300,32 303,40 311,41 305,46 307,54 300,50 293,54 295,46 289,41 297,40" fill="#d9a43a" />
        <circle cx="291" cy="72" r="2.6" fill="#c9524a" />
        <circle cx="308" cy="84" r="2.6" fill="#5f84a0" />
        <circle cx="285" cy="98" r="2.6" fill="#d9a43a" />
        <circle cx="303" cy="104" r="2.6" fill="#c9524a" />
        <circle cx="318" cy="106" r="2.6" fill="#d9a43a" />
        <circle cx="298" cy="62" r="2.2" fill="#d9a43a" />
      </g>

      <Bear x={258} scarf="#c9524a" />
      <Bear x={336} scarf="#5f84a0" />

      {/* gifts */}
      <g>
        <rect x="268" y="110" width="20" height="14" rx="2" fill="#c9524a" />
        <rect x="276" y="110" width="4" height="14" fill="#d9a43a" />
        <rect x="224" y="112" width="18" height="12" rx="2" fill="#5f84a0" />
        <rect x="231" y="112" width="4" height="12" fill="#f3ecdc" opacity="0.9" />
        <rect x="244" y="116" width="14" height="8" rx="2" fill="#6f9a78" />
        <rect x="249" y="116" width="4" height="8" fill="#d9a43a" />
      </g>
      </g>
    </svg>
  );
}
