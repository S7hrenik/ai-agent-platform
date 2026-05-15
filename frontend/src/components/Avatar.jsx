const PALETTE = [
  '#7c3aed','#2563eb','#db2777','#d97706',
  '#059669','#dc2626','#0891b2','#16a34a',
];

export function avatarColor(name) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

export default function Avatar({ name, size = 36 }) {
  const bg = avatarColor(name);
  const radius = Math.round(size * 0.28);
  const fontSize = Math.round(size * 0.42);
  return (
    <div style={{
      width: size, height: size, borderRadius: radius,
      background: bg, color: '#fff', fontWeight: 700,
      fontSize, display: 'flex', alignItems: 'center',
      justifyContent: 'center', flexShrink: 0,
      userSelect: 'none', letterSpacing: '-0.02em',
    }}>
      {name[0]?.toUpperCase()}
    </div>
  );
}
