type StarWheelProps = {
  size?: number
  className?: string
  glow?: boolean
}

// 占星星盘纹样（文档：astrology wheel / sacred geometry）
export function StarWheel({ size = 420, className = '', glow = false }: StarWheelProps) {
  const ticks = Array.from({ length: 24 }, (_, i) => i * 15)
  const zodiac = Array.from({ length: 12 }, (_, i) => i * 30)
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      className={className}
      aria-hidden="true"
      style={glow ? { filter: 'drop-shadow(0 0 18px rgba(214,181,109,0.45))' } : undefined}
    >
      <defs>
        <linearGradient id="sw-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#e9ce8c" />
          <stop offset="100%" stopColor="#8a6a32" />
        </linearGradient>
      </defs>
      <g fill="none" stroke="url(#sw-gold)">
        <circle cx="100" cy="100" r="96" strokeWidth="0.6" opacity="0.5" />
        <circle cx="100" cy="100" r="84" strokeWidth="0.4" opacity="0.35" />
        <circle cx="100" cy="100" r="58" strokeWidth="0.5" opacity="0.45" />
        <circle cx="100" cy="100" r="40" strokeWidth="0.4" opacity="0.3" />
        {/* 刻度 */}
        {ticks.map((deg) => (
          <line
            key={deg}
            x1="100"
            y1="4"
            x2="100"
            y2={deg % 30 === 0 ? 16 : 10}
            strokeWidth={deg % 30 === 0 ? 0.9 : 0.5}
            opacity="0.6"
            transform={`rotate(${deg} 100 100)`}
          />
        ))}
        {/* 十二宫分割线 */}
        {zodiac.map((deg) => (
          <line
            key={deg}
            x1="100"
            y1="16"
            x2="100"
            y2="42"
            strokeWidth="0.4"
            opacity="0.3"
            transform={`rotate(${deg} 100 100)`}
          />
        ))}
        {/* 神圣几何八角星 */}
        <path
          d="M100,44 L112,88 L156,100 L112,112 L100,156 L88,112 L44,100 L88,88 Z"
          strokeWidth="0.8"
          opacity="0.7"
        />
        <path
          d="M100,44 L112,88 L156,100 L112,112 L100,156 L88,112 L44,100 L88,88 Z"
          strokeWidth="0.5"
          opacity="0.4"
          transform="rotate(45 100 100)"
        />
      </g>
    </svg>
  )
}
