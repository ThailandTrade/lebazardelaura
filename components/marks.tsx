// Petits éléments graphiques « faits main » — logo et dessin d'étagère.
// Tons dans la palette (encre = currentColor, terracotta = var(--accent)).

export function Logo({ size = 26, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 28 28"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      {/* pile de livres */}
      <rect x="4" y="18" width="20" height="5" rx="1.4" fill="currentColor" />
      <rect x="6" y="12.2" width="16" height="5" rx="1.4" fill="var(--accent)" />
      <g transform="rotate(-9 15 8.5)">
        <rect x="9" y="6" width="13" height="5" rx="1.4" fill="currentColor" />
        <rect x="11" y="7.3" width="9" height="1" rx="0.5" fill="var(--surface)" />
      </g>
    </svg>
  );
}

type Spine = { x: number; w: number; h: number; fill: string; band?: string; outline?: boolean };

const SPINES: Spine[] = [
  { x: 24, w: 22, h: 104, fill: "currentColor", band: "var(--accent)" },
  { x: 50, w: 18, h: 92, fill: "var(--accent)" },
  { x: 72, w: 27, h: 110, fill: "var(--surface)", band: "currentColor", outline: true },
  { x: 103, w: 16, h: 84, fill: "var(--muted)" },
  { x: 123, w: 24, h: 116, fill: "currentColor", band: "var(--accent)" },
  { x: 151, w: 20, h: 96, fill: "var(--accent)" },
  { x: 175, w: 28, h: 106, fill: "var(--surface)", band: "var(--muted)", outline: true },
  { x: 207, w: 18, h: 88, fill: "currentColor" },
  { x: 229, w: 22, h: 100, fill: "var(--accent)", band: "var(--surface)" },
];

export function BookshelfDoodle({ className = "" }: { className?: string }) {
  const baseline = 140;
  return (
    <svg
      viewBox="0 0 360 160"
      fill="none"
      role="img"
      aria-label="Une étagère de livres"
      className={className}
    >
      {SPINES.map((s, i) => {
        const y = baseline - s.h;
        return (
          <g key={i}>
            <rect
              x={s.x}
              y={y}
              width={s.w}
              height={s.h}
              rx="2"
              fill={s.fill}
              stroke={s.outline ? "var(--line)" : "none"}
              strokeWidth={s.outline ? 1.5 : 0}
            />
            {s.band && (
              <rect x={s.x + 4} y={y + 13} width={s.w - 8} height="3" rx="1.5" fill={s.band} />
            )}
          </g>
        );
      })}

      {/* un livre qui penche */}
      <g transform="rotate(12 256 140)">
        <rect x="256" y="44" width="19" height="96" rx="2" fill="currentColor" />
        <rect x="260" y="57" width="11" height="3" rx="1.5" fill="var(--accent)" />
      </g>

      {/* deux livres couchés en pile à droite */}
      <rect x="286" y="128" width="60" height="12" rx="2" fill="var(--accent)" />
      <rect x="290" y="114" width="54" height="12" rx="2" fill="var(--surface)" stroke="var(--line)" strokeWidth="1.5" />

      {/* l'étagère */}
      <rect x="12" y="140" width="336" height="6" rx="3" fill="currentColor" />
      <rect x="20" y="146" width="6" height="10" rx="2" fill="currentColor" />
      <rect x="334" y="146" width="6" height="10" rx="2" fill="currentColor" />
    </svg>
  );
}
