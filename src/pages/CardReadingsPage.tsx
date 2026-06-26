import { useEffect, useRef, useState, useCallback } from 'react'
import { useArcanaStore } from '../store/tarotStore'
import { useGestureSession } from '../modules/gesture/useGestureSession'
import { useReadingGestures } from '../modules/gesture/useReadingGestures'
import { pointer, setPointer } from '../modules/input/pointerState'
import { TarotCardView } from '../components/TarotCard'
import { CameraPreview } from '../components/CameraPreview'
import { HandCursor } from '../components/HandCursor'
import { SPREAD_SLOTS } from '../data/tarotDeck'
import { getCard, positionLabel, orientationLabel } from '../modules/tarot/readingService'
import type { SpreadPosition } from '../types/tarot'
import { audioManager } from '../utils/audioManager'

const CARD_W = 130

// V0.2 页面 A：单牌解读页（CARD_READINGS）
// 三张牌并排，捏合/点击任意一张聚焦其详细解读；上下滑动滚动；右滑进入 AI 综合解读。
export function CardReadingsPage() {
  const phase = useArcanaStore((s) => s.phase)
  const mode = useArcanaStore((s) => s.mode)
  const result = useArcanaStore((s) => s.result)
  const goToAiSummary = useArcanaStore((s) => s.goToAiSummary)
  const setCameraError = useArcanaStore((s) => s.setCameraError)
  const goModeSelect = useArcanaStore((s) => s.goToModeSelect)

  const isGesture = mode === 'gesture'
  const active = phase === 'CARD_READINGS'

  const { videoRef, frameRef, state } = useGestureSession(isGesture, (err) => {
    setCameraError(err.message)
    goModeSelect()
  })

  const scrollRef = useRef<HTMLDivElement>(null)
  // 右滑切到综合解读页（手势含义随状态变化：仅此页右滑生效）
  useReadingGestures({
    active: active && isGesture,
    frameRef,
    scrollRef,
    onSwipeRight: () => {
      audioManager.play('card-flip')
      goToAiSummary()
    },
  })

  // 指针模式：鼠标/触控写入统一指针
  useEffect(() => {
    if (isGesture) return
    const move = (e: PointerEvent) =>
      setPointer({ x: e.clientX / window.innerWidth, y: e.clientY / window.innerHeight, present: true })
    const down = () => setPointer({ grabbing: true })
    const up = () => setPointer({ grabbing: false })
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerdown', down)
    window.addEventListener('pointerup', up)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerdown', down)
      window.removeEventListener('pointerup', up)
    }
  }, [isGesture])

  // 按 现状 / 阻碍 / 建议 排序
  const ordered = SPREAD_SLOTS.map((slot) => {
    const d = result?.cards.find((c) => c.position === slot.position)
    return d ? { drawn: d, card: getCard(d.cardId)! } : null
  }).filter((x): x is { drawn: NonNullable<typeof x>['drawn']; card: NonNullable<typeof x>['card'] } => x !== null)

  const [focused, setFocused] = useState<SpreadPosition>('situation')

  // 手势捏合聚焦：rAF 读取捏合点，落在哪张牌上即聚焦
  const cardEls = useRef<Map<SpreadPosition, HTMLDivElement>>(new Map())
  const pinchLock = useRef(false)
  const setCardEl = (pos: SpreadPosition) => (el: HTMLDivElement | null) => {
    if (el) cardEls.current.set(pos, el)
    else cardEls.current.delete(pos)
  }
  useEffect(() => {
    if (!active) return
    let raf = 0
    const loop = () => {
      if (pointer.grabbing && !pinchLock.current) {
        const px = pointer.x * window.innerWidth
        const py = pointer.y * window.innerHeight
        let hit: SpreadPosition | null = null
        cardEls.current.forEach((el, pos) => {
          const r = el.getBoundingClientRect()
          if (px >= r.left && px <= r.right && py >= r.top && py <= r.bottom) hit = pos
        })
        if (hit) {
          pinchLock.current = true
          setFocused(hit)
          audioManager.play('card-pick')
        }
      }
      if (!pointer.grabbing) pinchLock.current = false
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [active])

  const focusReading = useCallback(
    (pos: SpreadPosition) => {
      setFocused(pos)
      audioManager.play('card-pick')
    },
    [],
  )

  if (!result) {
    return (
      <div className="flex h-full w-full items-center justify-center text-grey-purple">正在生成解读……</div>
    )
  }

  const focusedEntry = ordered.find((o) => o.drawn.position === focused) ?? ordered[0]

  return (
    <div className="relative flex h-full w-full flex-col">
      <div ref={scrollRef} className="relative z-10 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-6 py-10">
          <div className="text-center">
            <p className="font-serif-en text-xs tracking-[0.4em] text-gold/60">YOUR READING</p>
            <h1 className="font-serif-zh mt-3 text-3xl text-gold-light">三张牌的回应</h1>
          </div>

          {/* 三张牌并排，点击/捏合聚焦 */}
          <div className="mt-8 flex flex-wrap items-start justify-center gap-6">
            {ordered.map(({ drawn, card }) => {
              const processed = {
                ...card,
                imageUrl: card.imageUrl.startsWith('http')
                  ? card.imageUrl
                  : `${import.meta.env.BASE_URL}${card.imageUrl.replace(/^\//, '')}`,
              }
              const isFocused = drawn.position === focused
              return (
                <div
                  key={drawn.position}
                  ref={setCardEl(drawn.position)}
                  className="flex cursor-pointer flex-col items-center"
                  onClick={() => focusReading(drawn.position)}
                >
                  <span
                    className={`font-serif-zh mb-3 rounded-full border px-4 py-1 text-sm transition-arcana ${
                      isFocused ? 'border-gold bg-gold/15 text-gold-light' : 'border-gold/40 text-gold'
                    }`}
                  >
                    {positionLabel(drawn.position)}
                  </span>
                  <TarotCardView
                    card={processed}
                    faceUp
                    orientation={drawn.orientation}
                    width={CARD_W}
                    hovering={isFocused}
                    showLabel
                  />
                </div>
              )
            })}
          </div>

          {/* 当前聚焦牌的详细解读 */}
          {focusedEntry && (
            <div className="anim-fade-up mt-10 rounded-2xl border border-gold/30 bg-black/30 p-6">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="font-serif-zh text-lg text-gold-light">
                  {positionLabel(focusedEntry.drawn.position)}
                </span>
                <span className="font-serif-zh text-xl text-ivory">{focusedEntry.card.nameZh}</span>
                <span className="font-serif-en text-sm text-grey-purple">{focusedEntry.card.nameEn}</span>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs ${
                    focusedEntry.drawn.orientation === 'upright'
                      ? 'bg-gold/15 text-gold'
                      : 'bg-warn-red/20 text-warn-red'
                  }`}
                >
                  {orientationLabel(focusedEntry.drawn.orientation)}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {focusedEntry.card[focusedEntry.drawn.orientation].keywords.map((k) => (
                  <span key={k} className="rounded-full bg-grey-purple/15 px-2.5 py-0.5 text-xs text-grey-purple">
                    {k}
                  </span>
                ))}
              </div>
              <p className="mt-4 text-sm leading-relaxed text-ivory/85">
                {focusedEntry.card[focusedEntry.drawn.orientation].meaning}
              </p>
              <p className="mt-3 text-sm leading-relaxed text-gold/85">
                <span className="text-gold">提醒：</span>
                {focusedEntry.card[focusedEntry.drawn.orientation].advice}
              </p>
            </div>
          )}

          <div className="mt-10 h-10" />
        </div>
      </div>

      {/* 底部手势提示 + 切页操作 */}
      <div className="relative z-20 flex items-center justify-between border-t border-gold/15 bg-black/40 px-6 py-3 backdrop-blur-sm">
        <p className="max-w-[70%] text-xs leading-relaxed text-grey-purple">
          {isGesture
            ? '捏合任意一张牌，查看它的详细回应。向右滑动手掌，查看牌阵的整体讯息。'
            : '点击任意一张牌查看详细回应。点击右侧按钮查看牌阵整体讯息。'}
        </p>
        <button
          onClick={goToAiSummary}
          className="font-serif-zh rounded-full border border-gold/50 px-4 py-1.5 text-sm text-gold-light transition-arcana hover:bg-gold/10"
        >
          整体讯息 →
        </button>
      </div>

      <HandCursor enabled />
      {isGesture && (
        <div className="absolute bottom-20 right-6 z-20">
          <CameraPreview
            ref={videoRef}
            small
            status={state === 'loading' ? '识别模型加载中…' : '捏合聚焦 · 右滑切页'}
          />
        </div>
      )}
    </div>
  )
}
