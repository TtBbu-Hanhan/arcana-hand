import { useEffect, useState } from 'react'
import { useArcanaStore } from '../store/tarotStore'
import { StarWheel } from '../components/StarWheel'
import { TarotCardView } from '../components/TarotCard'
import { CardSlot } from '../components/CardSlot'
import { SPREAD_SLOTS } from '../data/tarotDeck'
import { getCard } from '../modules/tarot/readingService'

// 页面七：仪式停顿 + 翻牌（文档 §7.2 / §6.6）
export function RevealPage() {
  const phase = useArcanaStore((s) => s.phase)
  const drawn = useArcanaStore((s) => s.drawn)
  const startReveal = useArcanaStore((s) => s.startReveal)
  const finishReveal = useArcanaStore((s) => s.finishReveal)

  const [ritualText, setRitualText] = useState('星盘正在校准你的能量……')
  const [glowIdx, setGlowIdx] = useState(-1) // 仪式停顿时三张牌依次发光
  const [flipped, setFlipped] = useState<number>(-1) // 已翻开到第几张

  // RITUAL_PAUSE：3 秒星盘动画（文档 §7.2）
  useEffect(() => {
    if (phase !== 'RITUAL_PAUSE') return
    const timers: number[] = []
    timers.push(window.setTimeout(() => setGlowIdx(0), 1000))
    timers.push(window.setTimeout(() => setGlowIdx(1), 1400))
    timers.push(window.setTimeout(() => setGlowIdx(2), 1800))
    timers.push(
      window.setTimeout(() => setRitualText('正在解读牌面之间的联系……'), 2000),
    )
    timers.push(window.setTimeout(() => startReveal(), 3000))
    return () => timers.forEach(clearTimeout)
  }, [phase, startReveal])

  // REVEALING：三张牌依次翻开（现状 → 阻碍 → 建议）
  useEffect(() => {
    if (phase !== 'REVEALING') return
    const timers: number[] = []
    timers.push(window.setTimeout(() => setFlipped(0), 200))
    timers.push(window.setTimeout(() => setFlipped(1), 1100))
    timers.push(window.setTimeout(() => setFlipped(2), 2000))
    timers.push(window.setTimeout(() => finishReveal(), 3400))
    return () => timers.forEach(clearTimeout)
  }, [phase, finishReveal])

  const isRitual = phase === 'RITUAL_PAUSE'

  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center px-6">
      {/* 旋转星盘 */}
      <div className="anim-spin-slow pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-40">
        <StarWheel size={720} glow />
      </div>

      <div className="relative z-10 flex items-end justify-center gap-6 sm:gap-10">
        {SPREAD_SLOTS.map((slot, i) => {
          const placed = drawn.find((d) => d.position === slot.position)
          const card = placed ? getCard(placed.cardId) : undefined
          const glow = isRitual && glowIdx >= i
          const faceUp = !isRitual && flipped >= i
          return (
            <div key={slot.position} className={glow ? 'anim-pulse-glow rounded-xl' : ''}>
              <div className="flex flex-col items-center gap-3">
                {card && placed ? (
                  <TarotCardView
                    card={card}
                    faceUp={faceUp}
                    orientation={placed.orientation}
                    width={130}
                    showLabel={faceUp}
                  />
                ) : (
                  <CardSlot slot={slot} width={130} state="filled" />
                )}
                {!faceUp && (
                  <span className="font-serif-zh text-sm text-gold/80">{slot.labelZh}</span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <p className="font-serif-zh anim-fade-up relative z-10 mt-14 text-center text-lg text-ivory/90">
        {isRitual ? ritualText : '三张牌正在回应你……'}
      </p>
    </div>
  )
}
