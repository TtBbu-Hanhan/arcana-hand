import type { SpreadSlot } from '../types/tarot'

type CardSlotProps = {
  slot: SpreadSlot
  width?: number
  state: 'empty' | 'active' | 'filled' // 空位 / 可放置 / 已放置
  highlight?: boolean // 卡牌靠近时发光
  children?: React.ReactNode
}

// 卡位：卡背图腾线稿版（文档 §9.4）
export function CardSlot({ slot, width = 150, state, highlight = false, children }: CardSlotProps) {
  const height = Math.round(width * 1.5)
  const active = state === 'active'
  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className={`relative rounded-[10px] transition-arcana ${
          highlight ? 'glow-gold-strong' : active ? 'glow-gold' : ''
        }`}
        style={{ width, height }}
      >
        {/* 线稿图腾边框 */}
        <div
          className={`absolute inset-0 rounded-[10px] border-2 border-dashed transition-arcana ${
            highlight
              ? 'border-gold-light'
              : active
                ? 'border-gold'
                : 'border-gold/35'
          }`}
        />
        {state !== 'filled' && (
          <img
            src="/cards/slot-totem.svg"
            alt=""
            aria-hidden="true"
            className={`absolute inset-0 h-full w-full p-1 transition-arcana ${
              active ? 'opacity-70' : 'opacity-35'
            }`}
            draggable={false}
          />
        )}
        {children}
      </div>
      <div className="text-center">
        <div
          className={`font-serif-zh text-base transition-arcana ${
            active ? 'text-gold-light' : 'text-gold'
          }`}
        >
          {slot.labelZh}
        </div>
        <div className="mt-0.5 max-w-[150px] text-[10px] leading-tight text-grey-purple">
          {slot.meaningZh}
        </div>
      </div>
    </div>
  )
}
