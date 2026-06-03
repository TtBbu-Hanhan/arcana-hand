import type { CSSProperties } from 'react'
import type { TarotCard as TarotCardData, Orientation } from '../types/tarot'

type TarotCardProps = {
  card?: TarotCardData
  faceUp?: boolean
  orientation?: Orientation
  width?: number
  // 交互态
  hovering?: boolean // 手靠近：浮起 + 发光 + 震动
  selected?: boolean // 被捏合/拖动中
  dimmed?: boolean
  style?: CSSProperties
  className?: string
  showLabel?: boolean
  onPointerDown?: (e: React.PointerEvent) => void
}

// 单张塔罗牌：CSS 3D 翻转，正面为 RWS 图，背面为原创卡背
export function TarotCardView({
  card,
  faceUp = false,
  orientation = 'upright',
  width = 150,
  hovering = false,
  selected = false,
  dimmed = false,
  style,
  className = '',
  showLabel = false,
  onPointerDown,
}: TarotCardProps) {
  const height = Math.round(width * 1.5)
  const reversed = faceUp && orientation === 'reversed'

  const glowClass = selected
    ? 'glow-gold-strong'
    : hovering
      ? 'glow-gold'
      : ''

  return (
    <div
      className={`scene-3d select-none ${className}`}
      style={{ width, height, ...style }}
      onPointerDown={onPointerDown}
    >
      <div
        className={`preserve-3d transition-arcana relative h-full w-full rounded-[10px] ${
          hovering && !faceUp ? 'anim-jitter' : ''
        }`}
        style={{
          transform: `${faceUp ? 'rotateY(180deg)' : 'rotateY(0deg)'} ${
            hovering ? 'translateY(-9px) scale(1.05)' : ''
          }`,
          opacity: dimmed ? 0.45 : 1,
        }}
      >
        {/* 背面 */}
        <div
          className={`backface-hidden absolute inset-0 overflow-hidden rounded-[10px] ${glowClass}`}
          style={{ transform: 'rotateY(0deg)' }}
        >
          <img
            src="/cards/card-back.svg"
            alt="卡背"
            className="h-full w-full object-cover"
            draggable={false}
          />
        </div>

        {/* 正面 */}
        <div
          className={`backface-hidden absolute inset-0 overflow-hidden rounded-[10px] border border-gold/60 bg-bg-blue ${glowClass}`}
          style={{ transform: 'rotateY(180deg)' }}
        >
          {card && (
            <div className="relative h-full w-full" style={{ transform: reversed ? 'rotate(180deg)' : undefined }}>
              <img
                src={card.imageUrl}
                alt={card.nameZh}
                className="h-full w-full object-cover"
                draggable={false}
              />
            </div>
          )}
        </div>
      </div>

      {showLabel && card && faceUp && (
        <div className="mt-2 text-center">
          <div className="font-serif-zh text-sm text-gold">{card.nameZh}</div>
          <div className="text-[10px] tracking-widest text-grey-purple">
            {orientationLabelLocal(orientation)}
          </div>
        </div>
      )}
    </div>
  )
}

function orientationLabelLocal(o: Orientation): string {
  return o === 'upright' ? '正位' : '逆位'
}
