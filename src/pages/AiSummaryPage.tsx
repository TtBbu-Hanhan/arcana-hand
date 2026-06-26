import { useEffect, useRef } from 'react'
import { useArcanaStore } from '../store/tarotStore'
import { useGestureSession } from '../modules/gesture/useGestureSession'
import { useReadingGestures } from '../modules/gesture/useReadingGestures'
import { setPointer } from '../modules/input/pointerState'
import { RitualButton } from '../components/RitualButton'
import { StarWheel } from '../components/StarWheel'
import { CameraPreview } from '../components/CameraPreview'
import { HandCursor } from '../components/HandCursor'
import { SPREAD_SLOTS } from '../data/tarotDeck'
import { getCard, positionLabel, orientationLabel } from '../modules/tarot/readingService'
import { audioManager } from '../utils/audioManager'

// V0.2 页面 B：AI 综合解读页（AI_SUMMARY）
// 显示问题与 AI/本地生成的综合解读；上下滑动滚动；左滑返回单牌解读页。
export function AiSummaryPage() {
  const phase = useArcanaStore((s) => s.phase)
  const mode = useArcanaStore((s) => s.mode)
  const result = useArcanaStore((s) => s.result)
  const backToCardReadings = useArcanaStore((s) => s.backToCardReadings)
  const reset = useArcanaStore((s) => s.reset)
  const setCameraError = useArcanaStore((s) => s.setCameraError)
  const goModeSelect = useArcanaStore((s) => s.goToModeSelect)

  const isGesture = mode === 'gesture'
  const active = phase === 'AI_SUMMARY'

  const { videoRef, frameRef, state } = useGestureSession(isGesture, (err) => {
    setCameraError(err.message)
    goModeSelect()
  })

  const scrollRef = useRef<HTMLDivElement>(null)
  // 左滑返回单牌解读页（仅此页左滑生效）
  useReadingGestures({
    active: active && isGesture,
    frameRef,
    scrollRef,
    onSwipeLeft: () => {
      audioManager.play('card-flip')
      backToCardReadings()
    },
  })

  // 指针模式：写入统一指针（让光标与滚轮可用）
  useEffect(() => {
    if (isGesture) return
    const move = (e: PointerEvent) =>
      setPointer({ x: e.clientX / window.innerWidth, y: e.clientY / window.innerHeight, present: true })
    window.addEventListener('pointermove', move)
    return () => window.removeEventListener('pointermove', move)
  }, [isGesture])

  if (!result) {
    return (
      <div className="flex h-full w-full items-center justify-center text-grey-purple">正在生成解读……</div>
    )
  }

  const ordered = SPREAD_SLOTS.map((slot) => {
    const d = result.cards.find((c) => c.position === slot.position)
    return d ? { drawn: d, card: getCard(d.cardId)! } : null
  }).filter((x): x is { drawn: NonNullable<typeof x>['drawn']; card: NonNullable<typeof x>['card'] } => x !== null)

  return (
    <div className="relative flex h-full w-full flex-col">
      <div className="anim-spin-reverse pointer-events-none fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-10">
        <StarWheel size={760} />
      </div>

      <div ref={scrollRef} className="relative z-10 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-6 py-10">
          <div className="text-center">
            <p className="font-serif-en text-xs tracking-[0.4em] text-gold/60">THE WHOLE MESSAGE</p>
            <h1 className="font-serif-zh mt-3 text-3xl text-gold-light">牌阵的整体讯息</h1>
          </div>

          {/* 用户问题 */}
          <div className="anim-unfurl mt-8 rounded-2xl border border-gold/30 bg-black/30 px-6 py-5 text-center">
            <p className="text-xs tracking-widest text-grey-purple">你的问题</p>
            <p className="font-serif-zh mt-2 text-lg text-ivory">
              {result.question ? result.question : '本次占卜问题：未填写'}
            </p>
          </div>

          {/* 三张牌速览 */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            {ordered.map(({ drawn, card }) => (
              <span
                key={drawn.position}
                className="rounded-full border border-gold/25 px-3 py-1 text-xs text-grey-purple"
              >
                {positionLabel(drawn.position)} · {card.nameZh} · {orientationLabel(drawn.orientation)}
              </span>
            ))}
          </div>

          {/* 综合解读 */}
          <div className="anim-unfurl mt-8 rounded-2xl border border-gold/40 bg-gradient-to-b from-gold/10 to-transparent p-7">
            <h2 className="font-serif-zh text-xl text-gold-light">整体解读</h2>
            <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-ivory/90">{result.summary}</p>
            <div className="mt-5 border-t border-gold/20 pt-5">
              <p className="font-serif-zh text-sm text-gold">给你的行动建议</p>
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ivory/90">{result.finalAdvice}</p>
            </div>
          </div>

          <div className="mt-10 text-center">
            <RitualButton onClick={reset}>重新占卜</RitualButton>
          </div>

          <p className="mt-8 text-center text-xs leading-relaxed text-grey-purple/60">
            塔罗解读仅供自我觉察与娱乐参考，重要决定请结合现实判断。
            <br />
            牌面图像采用公有领域 Rider-Waite-Smith 牌组。
          </p>
          <div className="h-6" />
        </div>
      </div>

      {/* 底部手势提示 + 返回 */}
      <div className="relative z-20 flex items-center justify-between border-t border-gold/15 bg-black/40 px-6 py-3 backdrop-blur-sm">
        <button
          onClick={backToCardReadings}
          className="font-serif-zh rounded-full border border-gold/50 px-4 py-1.5 text-sm text-gold-light transition-arcana hover:bg-gold/10"
        >
          ← 逐张牌解读
        </button>
        <p className="max-w-[70%] text-right text-xs leading-relaxed text-grey-purple">
          {isGesture ? '向左滑动手掌，可返回逐张牌解读。' : '点击左侧按钮返回逐张牌解读。'}
        </p>
      </div>

      <HandCursor enabled />
      {isGesture && (
        <div className="absolute bottom-20 right-6 z-20">
          <CameraPreview
            ref={videoRef}
            small
            status={state === 'loading' ? '识别模型加载中…' : '左滑返回 · 上下滑动浏览'}
          />
        </div>
      )}
    </div>
  )
}
