import { useEffect, useRef, useState, useCallback } from 'react'
import { useArcanaStore } from '../store/tarotStore'
import { useGestureSession } from '../modules/gesture/useGestureSession'
import { pointer, setPointer } from '../modules/input/pointerState'
import { CameraPreview } from '../components/CameraPreview'
import { HandCursor } from '../components/HandCursor'
import { StarWheel } from '../components/StarWheel'
import { audioManager } from '../utils/audioManager'

const HOVER_HOLD_MS = 400 // 悬停 0.4s 才高亮
const PINCH_HOLD_MS = 300 // 捏合保持 0.3s 才确认
const CARD_W = 116

// V0.2 页面：三堆切牌。悬停 + 捏合选择其中一堆。
export function CutDeckPage() {
  const mode = useArcanaStore((s) => s.mode)
  const phase = useArcanaStore((s) => s.phase)
  const piles = useArcanaStore((s) => s.piles)
  const choosePile = useArcanaStore((s) => s.choosePile)
  const selectedPileIndex = useArcanaStore((s) => s.selectedPileIndex)
  const setCameraError = useArcanaStore((s) => s.setCameraError)
  const goModeSelect = useArcanaStore((s) => s.goToModeSelect)

  const isGesture = mode === 'gesture'
  const spreading = phase === 'SPREAD_SELECTED_PILE'

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

  const pileEls = useRef<Map<number, HTMLDivElement>>(new Map())
  const pileRects = useRef<Map<number, DOMRect>>(new Map())
  const [hovered, setHovered] = useState<number | null>(null)
  const [confirmed, setConfirmed] = useState<number | null>(null)
  const progressEl = useRef<HTMLDivElement>(null)

  const hoverStart = useRef<number | null>(null)
  const pinchStart = useRef<number | null>(null)
  const locked = useRef(false)

  const measure = useCallback(() => {
    const rects = new Map<number, DOMRect>()
    pileEls.current.forEach((el, i) => {
      rects.set(i, el.getBoundingClientRect())
    })
    pileRects.current = rects
  }, [])

  useEffect(() => {
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [measure, piles.length])

  const confirmPile = useCallback(
    (i: number) => {
      if (locked.current) return
      locked.current = true
      setConfirmed(i)
      audioManager.play('card-pick')
      // 选中堆靠近镜头的短暂强调后，交给 store 进入摊牌
      setTimeout(() => choosePile(i), 450)
    },
    [choosePile],
  )

  // 主交互循环：悬停高亮 + 捏合确认（仅在 CUT_DECK / CHOOSE_PILE 阶段）
  useEffect(() => {
    if (spreading || confirmed !== null) return
    let raf = 0
    const loop = () => {
      const vw = window.innerWidth
      const vh = window.innerHeight
      const px = pointer.x * vw
      const py = pointer.y * vh

      // 找指针所在的牌堆：矩形包含判定（带少量外扩容差），互不重叠不会误判
      let over: number | null = null
      const MARGIN = 24
      pileRects.current.forEach((r, i) => {
        if (
          px >= r.left - MARGIN &&
          px <= r.right + MARGIN &&
          py >= r.top - MARGIN &&
          py <= r.bottom + MARGIN
        ) {
          over = i
        }
      })

      // 悬停 0.4s 才正式高亮
      if (over !== null) {
        if (hoverStart.current === null) hoverStart.current = performance.now()
        const held = performance.now() - hoverStart.current
        if (held >= HOVER_HOLD_MS) setHovered((p) => (p !== over ? over : p))
      } else {
        hoverStart.current = null
        setHovered((p) => (p !== null ? null : p))
      }

      // 捏合保持 0.3s 才确认
      if (pointer.grabbing && hovered !== null) {
        if (pinchStart.current === null) pinchStart.current = performance.now()
        const held = performance.now() - pinchStart.current
        const prog = Math.min(1, held / PINCH_HOLD_MS)
        if (progressEl.current) {
          const r = pileRects.current.get(hovered)
          if (r) {
            progressEl.current.style.left = `${r.left + r.width / 2}px`
            progressEl.current.style.top = `${r.bottom + 24}px`
            progressEl.current.style.opacity = '1'
            progressEl.current.style.transform = `translateX(-50%) scaleX(${prog})`
          }
        }
        if (held >= PINCH_HOLD_MS) {
          confirmPile(hovered)
          if (progressEl.current) progressEl.current.style.opacity = '0'
        }
      } else {
        pinchStart.current = null
        if (progressEl.current) progressEl.current.style.opacity = '0'
      }

      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [spreading, confirmed, hovered, confirmPile])

  const setPileEl = (i: number) => (el: HTMLDivElement | null) => {
    if (el) pileEls.current.set(i, el)
    else pileEls.current.delete(i)
  }

  const promptText =
    state === 'loading' && isGesture
      ? '识别模型加载中…'
      : spreading
        ? '牌堆正在为你摊开……'
        : isGesture
          ? '让直觉停在其中一叠牌上，并捏合确认。'
          : '让直觉停在其中一叠牌上，点击确认。'

  return (
    <div className="relative flex h-full w-full touch-none flex-col items-center justify-between py-10">
      {/* 顶部文案 */}
      <div className="px-6 text-center">
        <h1 className="font-serif-zh text-2xl text-gold-light sm:text-3xl">78 张牌已被分为三堆</h1>
        <p className="mt-2 text-sm text-grey-purple">{promptText}</p>
      </div>

      {/* 中央星盘 + 三堆牌 */}
      <div className="relative flex h-[360px] w-full items-center justify-center" style={{ perspective: '1200px' }}>
        <div className="pointer-events-none absolute opacity-20">
          <StarWheel size={320} glow={false} />
        </div>

        {/* 用 flex 横向排布，三堆各占独立列、物理上不会重叠；
            悬停/选中仅用 transform(translateY+scale)，不影响布局流，因此不会推挤或遮挡兄弟堆。 */}
        <div className="relative z-10 flex items-center justify-center gap-10 sm:gap-16">
          {[0, 1, 2].map((i) => {
            const isHover = hovered === i && confirmed === null
            const isConfirmed = confirmed === i
            const faded = confirmed !== null && confirmed !== i
            // 中间堆略高，形成仪式桌面层次（不改变水平位置）
            const baseY = i === 1 ? -18 : 0
            // 预选（悬停）与确认都【原地】强调：仅微微浮起 + 放大 + 发光
            const lift = isConfirmed ? -16 : isHover ? -14 : 0
            const scale = isConfirmed ? 1.08 : isHover ? 1.05 : 1
            return (
              <div
                key={i}
                ref={setPileEl(i)}
                onClick={() => {
                  // 指针模式备用：点击牌堆等价于捏合确认
                  if (!isGesture && confirmed === null) confirmPile(i)
                }}
                className={`cursor-pointer transition-all duration-500 ${isHover ? 'anim-jitter' : ''}`}
                style={{
                  transform: `translateY(${baseY + lift}px) scale(${scale})`,
                  opacity: faded ? 0 : 1,
                  zIndex: isConfirmed ? 50 : isHover ? 40 : 10 + i,
                }}
              >
                <PileStack highlight={isHover || isConfirmed} count={piles[i]?.length ?? 26} />
              </div>
            )
          })}
        </div>
      </div>

      {/* 底部花色提示 */}
      <div className="flex flex-col items-center gap-2">
        <p className="font-serif-en text-sm tracking-widest text-gold/70">CHOOSE YOUR PILE</p>
        {selectedPileIndex !== null && (
          <p className="text-xs text-grey-purple">命运已回应你的直觉</p>
        )}
      </div>

      {/* 捏合保持进度条 */}
      <div
        ref={progressEl}
        className="pointer-events-none fixed left-0 top-0 z-[55] h-1 w-20 origin-center rounded-full bg-gold-light opacity-0 transition-[opacity]"
        style={{ boxShadow: '0 0 8px rgba(214,181,109,0.8)' }}
      />

      <HandCursor enabled />
      {isGesture && (
        <div className="absolute bottom-6 right-6">
          <CameraPreview
            ref={videoRef}
            small
            status={pointer.grabbing ? '捏合中' : '移动手部靠近牌堆'}
          />
        </div>
      )}
    </div>
  )
}

// 单个牌堆：用现有卡背叠出厚度感（错位边缘），不替换卡背视觉
function PileStack({ highlight, count }: { highlight: boolean; count: number }) {
  const layers = Math.min(6, Math.max(3, Math.round(count / 5)))
  const w = CARD_W
  const h = Math.round(w * 1.5)
  return (
    <div className={`relative ${highlight ? 'glow-gold' : ''}`} style={{ width: w + 14, height: h + 14 }}>
      {Array.from({ length: layers }).map((_, k) => {
        const off = (layers - 1 - k) * 2.4 // 错位边缘
        return (
          <div
            key={k}
            className="absolute overflow-hidden rounded-[10px] border border-gold/40"
            style={{
              width: w,
              height: h,
              left: off,
              top: off,
              zIndex: k,
              boxShadow: k === layers - 1 ? '0 6px 20px rgba(0,0,0,0.45)' : undefined,
            }}
          >
            <img
              src={`${import.meta.env.BASE_URL}cards/card-back.svg`}
              alt="卡背"
              className="h-full w-full object-cover"
              draggable={false}
            />
          </div>
        )
      })}
    </div>
  )
}
