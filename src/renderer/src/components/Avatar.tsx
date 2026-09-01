const PALETTE = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#14b8a6', '#f43f5e']

function colorFor(name: string): string {
  let hash = 0
  for (const ch of name) hash = (hash * 31 + ch.codePointAt(0)!) >>> 0
  return PALETTE[hash % PALETTE.length]
}

export default function Avatar({ name }: { name: string }): React.JSX.Element {
  return (
    <span className="avatar" aria-hidden="true" style={{ background: colorFor(name) }}>
      {name.trim().charAt(0) || '?'}
    </span>
  )
}
