import { useEffect, useLayoutEffect, useRef, useState, useCallback } from 'react'
import { useArcanaStore, currentSlotIndex } from '../store/tarotStore'
import { useGestureSession } from '../modules/gesture/useGestureSession'
import { pointer, setPointer } from '../modules/input/pointerState'
import { TarotCardView } from '../components/TarotCard'
import { CardSlot } from '../components/CardSlot'
import { CameraPreview } from '../components/CameraPreview'
import { HandCursor } from '../components/HandCursor'
import { SPREAD_SLOTS } from '../data/tarotDeck'
import { getCard } from '../modules/tarot/readingService'

const HOVER_PX = 110 // 靠近判定半径
const HOLD_MS = 300 // 捏合保持 0.3s 才算有效选中
const CARD_W = 116

// 页面六：抽牌与放牌页（文档 §6.6 / §7.1）
export function DrawPage() {
  const mode = useArcanaStore((s) => s.mode)
  const phase = useArcanaStore((s) => s.phase)
  const deck = useArcanaStore((s) => s.deck)
  const drawn = useArcanaStore((s) => s.drawn)
  const drawCard = useArcanaStore((s) => s.drawCardToCurrentSlot)
  const setCameraError = useArcanaStore((s) => s.setCameraError)
  const goModeSelect = useArcanaStore((s) => s.goToModeSelect)

  const isGesture = mode === 'gesture'
  const slotIndex = currentSlotIndex(phase)

  const { videoRef, state } = useGestureSession(isGesture, (err) => {
    setCameraError(err.message)
    goModeSelect()
  })

  // 指针模式：把鼠标/触控写入统一指针状态
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

  // 牌阵中尚未抽出的牌
  const drawnIds = new Set(drawn.map((d) => d.cardId))
  const available = deck.filter((d) => !drawnIds.has(d.id))

  // DOM 引用
  const cardEls = useRef<Map<string, HTMLDivElement>>(new Map())
  const cardCenters = useRef<Map<string, { x: number; y: number }>>(new Map())
  const slotEl = useRef<HTMLDivElement>(null)
  const slotRect = useRef<DOMRect | null>(null)
  const floatingEl = useRef<HTMLDivElement>(null)
  const progressEl = useRef<HTMLDivElement>(null)

  // 交互态（离散）
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [slotHot, setSlotHot] = useState(false)
  const [returning, setReturning] = useState(false)

  const selectedIdRef = useRef<string | null>(null)
  selectedIdRef.current = selectedId
  const hoveredIdRef = useRef<string | null>(null)
  hoveredIdRef.current = hoveredId

  const holdStart = useRef<number | null>(null)
  const dropping = useRef(false)

  const measure = useCallback(() => {
    const centers = new Map<string, { x: number; y: number }>()
    cardEls.current.forEach((el, id) => {
      const r = el.getBoundingClientRect()
      centers.set(id, { x: r.left + r.width / 2, y: r.top + r.height / 2 })
    })
    cardCenters.current = centers
    if (slotEl.current) slotRect.current = slotEl.current.getBoundingClientRect()
  }, [])

  useLayoutEffect(() => {
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [measure, available.length, slotIndex])

  // 主交互循环
  useEffect(() => {
    let raf = 0
    const loop = () => {
      const vw = window.innerWidth
      const vh = window.innerHeight
      const px = pointer.x * vw
      const py = pointer.y * vh

      const sel = selectedIdRef.current
      if (sel) {
        // 拖动中：浮动卡跟随
        if (floatingEl.current) {
          floatingEl.current.style.transform = `translate(${px}px, ${py}px) translate(-50%, -50%)`
        }
        // 是否进入卡位
        const sr = slotRect.current
        const over =
          !!sr && px >= sr.left && px <= sr.right && py >= sr.top && py <= sr.bottom
        setSlotHot((prev) => (prev !== over ? over : prev))

        if (!pointer.grabbing && !dropping.current) {
          dropping.current = true
          if (over) {
            const slot = deck.find((d) => d.id === sel)
            if (slot) drawCard(slot.deckIndex)
          } else {
            // 放错位置：返回原位
            setReturning(true)
            setTimeout(() => setReturning(false), 350)
          }
          setSelectedId(null)
          setSlotHot(false)
          holdStart.current = null
          setTimeout(() => (dropping.current = false), 50)
        }
      } else {
        // 悬停检测：找最近的牌
        let nearest: string | null = null
        let best = HOVER_PX
        cardCenters.current.forEach((c, id) => {
          const d = Math.hypot(c.x - px, c.y - py)
          if (d < best) {
            best = d
            nearest = id
          }
        })
        setHoveredId((prev) => (prev !== nearest ? nearest : prev))

        // 捏合保持 0.3s → 选中
        if (pointer.grabbing && nearest) {
          if (holdStart.current === null) holdStart.current = performance.now()
          const held = performance.now() - holdStart.current
          const prog = Math.min(1, held / HOLD_MS)
          if (progressEl.current) {
            progressEl.current.style.transform = `scaleX(${prog})`
            const c = cardCenters.current.get(nearest)
            if (c) {
              progressEl.current.style.left = `${c.x}px`
              progressEl.current.style.top = `${c.y + 92}px`
              progressEl.current.style.opacity = '1'
            }
          }
          if (held >= HOLD_MS) {
            setSelectedId(nearest)
            holdStart.current = null
            if (progressEl.current) progressEl.current.style.opacity = '0'
          }
        } else {
          holdStart.current = null
          if (progressEl.current) progressEl.current.style.opacity = '0'
        }
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deck, drawCard, available.length])

  const setCardEl = (id: string) => (el: HTMLDivElement | null) => {
    if (el) cardEls.current.set(id, el)
    else cardEls.current.delete(id)
  }

  const rawSelectedCard = selectedId ? getCard(selectedId) : undefined
  // ⚠️ 核心修复：给拖拽中的悬浮卡正面图做路径防错隔离
  const selectedCard = rawSelectedCard ? {
    ...rawSelectedCard,
    imageUrl: rawSelectedCard.imageUrl.startsWith('http')
      ? rawSelectedCard.imageUrl
      : `${import.meta.env.BASE_URL}${rawSelectedCard.imageUrl.replace(/^\//, '')}`
  } : undefined

  const currentSlot = SPREAD_SLOTS[slotIndex] ?? SPREAD_SLOTS[0]

  const promptText =
    state === 'loading' && isGesture
      ? '识别模型加载中…'
      : selectedId
        ? `将牌移入「${currentSlot.labelZh}」卡位，松开放下`
        : `靠近你感受到的那张牌${isGesture ? '，捏合手指将它取出' : '，按住并拖到卡位'}`

  return (
    <div className="relative flex h-full w-full touch-none flex-col items-center justify-between py-8">
      {/* 顶部提示 */}
      <div className="px-6 text-center">
        <h1 className="font-serif-zh text-2xl text-gold-light">
          正在抽取第 {slotIndex + 1} 张 · {currentSlot.labelZh}
        </h1>
        <p className="mt-2 text-sm text-grey-purple">{promptText}</p>
      </div>

      {/* 中间弧形卡牌阵列 */}
      <div className="relative flex h-[300px] w-full items-center justify-center">
        {available.map((slot, i) => {
          const mid = (available.length - 1) / 2
          const offset = i - mid
          const angle = offset * 5.2
          const x = offset * 50
          const y = Math.abs(offset) * 7
          const isHover = hoveredId === slot.id && !selectedId
          const isSel = selectedId === slot.id
          return (
            <div
              key={slot.id}
              ref={setCardEl(slot.id)}
              className="absolute transition-[opacity]"
              style={{
                transform: `translateX(${x}px) translateY(${y}px) rotate(${angle}deg)`,
                zIndex: isHover ? 100 : i,
                opacity: isSel ? 0 : 1,
              }}
            >
              <TarotCardView width={CARD_W} hovering={isHover} />
            </div>
          )
        })}
      </div>

      {/* 三个卡位 */}
      <div className="flex items-end justify-center gap-6 px-6 sm:gap-10">
        {SPREAD_SLOTS.map((slot, i) => {
          const placed = drawn.find((d) => d.position === slot.position)
          const rawPlacedCard = placed ? getCard(placed.cardId) : undefined
          
          // ⚠️ 核心修复：给放好在卡位里的卡也补齐路径，确保能安全渲染
          const placedCard = rawPlacedCard ? {
            ...rawPlacedCard,
            imageUrl: rawPlacedCard.imageUrl.startsWith('http')
              ? rawPlacedCard.imageUrl
              : `${import.meta.env.BASE_URL}${rawPlacedCard.imageUrl.replace(/^\//, '')}`
          } : undefined

          const isCurrent = i === slotIndex
          return (
            <div key={slot.position} ref={isCurrent ? slotEl : undefined}>
              <CardSlot
                slot={slot}
                width={CARD_W}
                state={placed ? 'filled' : isCurrent ? 'active' : 'empty'}
                highlight={isCurrent && slotHot}
              >
                {placedCard && placed && (
                  <div className="anim-fade-up absolute inset-0">
                    <TarotCardView
                      card={placedCard}
                      faceUp={false} // 保持卡背朝下，但路径已被上方的变数保护不会报错白屏
                      orientation={placed.orientation}
                      width={CARD_W}
                    />
                  </div>
                )}
              </CardSlot>
            </div>
          )
        })}
      </div>

      {/* 拖动中的浮动卡 */}
      {selectedCard && (
        <div
          ref={floatingEl}
          className="pointer-events-none fixed left-0 top-0 z-[60]"
          style={{ transform: 'translate(-100px,-100px)' }}
        >
          <TarotCardView card={selectedCard} width={CARD_W} selected className={returning ? '' : ''} />
        </div>
      )}

      {/* 捏合保持进度条 */}
      <div
        ref={progressEl}
        className="pointer-events-none fixed left-0 top-0 z-[55] h-1 w-16 origin-left -translate-x-1/2 rounded-full bg-gold-light opacity-0 transition-[opacity]"
        style={{ boxShadow: '0 0 8px rgba(214,181,109,0.8)' }}
      />

      {/* 金色光点 + 摄像头窗 */}
      <HandCursor enabled />
      {isGesture && (
        <div className="absolute bottom-6 right-6">
          <CameraPreview ref={videoRef} small status={pointer.grabbing ? '捏合中' : '移动手部靠近卡牌'} />
        </div>
      )}
    </div>
  )
}