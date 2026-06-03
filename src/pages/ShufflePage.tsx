import { useEffect, useRef, useState } from 'react'
import { useArcanaStore, SHUFFLE_TARGET } from '../store/tarotStore'
import { useGestureSession } from '../modules/gesture/useGestureSession'
import { CameraPreview } from '../components/CameraPreview'
import { TarotCardView } from '../components/TarotCard'

const SWIPE_THRESHOLD = 0.22 // 手掌中心 x 归一化位移阈值

// 页面五：洗牌页（文档 §6.5）
export function ShufflePage() {
  const mode = useArcanaStore((s) => s.mode)
  const shuffleCount = useArcanaStore((s) => s.shuffleCount)
  const registerSwipe = useArcanaStore((s) => s.registerShuffleSwipe)
  const setCameraError = useArcanaStore((s) => s.setCameraError)
  const goModeSelect = useArcanaStore((s) => s.goToModeSelect)

  const isGesture = mode === 'gesture'
  const { videoRef, frameRef, state } = useGestureSession(isGesture, (err) => {
    setCameraError(err.message)
    goModeSelect()
  })

  const [openPalm, setOpenPalm] = useState(false)
  const [scatter, setScatter] = useState(0) // 0..1 散开程度，触发重排动画
  const cooldown = useRef(false)

  // 手势洗牌检测：张开手掌时跟踪 palm.x 往返位移
  const swipeOrigin = useRef<number | null>(null)
  const lastDir = useRef<0 | 1 | -1>(0)

  const triggerSwipe = () => {
    if (cooldown.current) return
    cooldown.current = true
    setScatter(1)
    registerSwipe()
    setTimeout(() => setScatter(0), 600)
    setTimeout(() => (cooldown.current = false), 700)
  }

  useEffect(() => {
    if (!isGesture) return
    let raf = 0
    const loop = () => {
      const f = frameRef.current
      setOpenPalm(f.openPalm && f.present)
      if (f.present && f.openPalm) {
        const x = f.palm.x
        const origin = swipeOrigin.current ?? x
        swipeOrigin.current = origin
        const dx = x - origin
        if (Math.abs(dx) > SWIPE_THRESHOLD) {
          const dir = dx > 0 ? 1 : -1
          if (dir !== lastDir.current) {
            lastDir.current = dir
            triggerSwipe()
          }
          swipeOrigin.current = x // 重置基准，等待反向
        }
      } else {
        swipeOrigin.current = null
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isGesture])

  // 指针洗牌检测：鼠标/触控左右拖动
  const dragStart = useRef<number | null>(null)
  const dragDir = useRef<0 | 1 | -1>(0)
  const onPointerDown = (e: React.PointerEvent) => {
    if (isGesture) return
    dragStart.current = e.clientX
    dragDir.current = 0
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (isGesture || dragStart.current === null) return
    const dx = (e.clientX - dragStart.current) / window.innerWidth
    if (Math.abs(dx) > SWIPE_THRESHOLD) {
      const dir = dx > 0 ? 1 : -1
      if (dir !== dragDir.current) {
        dragDir.current = dir
        triggerSwipe()
      }
      dragStart.current = e.clientX
    }
  }
  const onPointerUp = () => {
    dragStart.current = null
  }

  const cards = Array.from({ length: 11 })
  const statusText = isGesture
    ? state === 'loading'
      ? '识别模型加载中…'
      : openPalm
        ? '手掌已张开，左右滑动'
        : '请张开手掌'
    : '按住并左右拖动'

  return (
    <div
      className="relative flex h-full w-full touch-none flex-col items-center justify-between py-12"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
    >
      {/* 顶部操作提示 */}
      <div className="text-center">
        <h1 className="font-serif-zh text-2xl text-gold-light sm:text-3xl">
          {isGesture ? '张开手掌，左右滑动。' : '左右拖动，洗动牌阵。'}
        </h1>
        <p className="mt-2 text-sm text-grey-purple">让牌阵重新排列。</p>
      </div>

      {/* 中间弧形卡背阵列 */}
      <div className="relative flex h-[320px] w-full items-center justify-center">
        {cards.map((_, i) => {
          const mid = (cards.length - 1) / 2
          const offset = i - mid
          const baseAngle = offset * 7
          const baseX = offset * 56
          const baseY = Math.abs(offset) * 9
          const scatterX = scatter * offset * 26
          const scatterRot = scatter * offset * 14
          return (
            <div
              key={i}
              className="transition-arcana absolute"
              style={{
                transform: `translateX(${baseX + scatterX}px) translateY(${
                  baseY - scatter * 30
                }px) rotate(${baseAngle + scatterRot}deg)`,
                zIndex: i,
              }}
            >
              <TarotCardView width={120} />
            </div>
          )
        })}
      </div>

      {/* 底部进度 */}
      <div className="flex flex-col items-center gap-3">
        <div className="flex items-center gap-2">
          {Array.from({ length: SHUFFLE_TARGET }).map((_, i) => (
            <span
              key={i}
              className={`h-2.5 w-2.5 rounded-full transition-arcana ${
                i < shuffleCount ? 'bg-gold shadow-[0_0_10px_rgba(214,181,109,0.8)]' : 'bg-gold/20'
              }`}
            />
          ))}
        </div>
        <p className="font-serif-en text-sm tracking-widest text-gold/80">
          洗牌 {shuffleCount}/{SHUFFLE_TARGET}
        </p>
      </div>

      {/* 右下角摄像头小窗 */}
      {isGesture && (
        <div className="absolute bottom-6 right-6">
          <CameraPreview ref={videoRef} small status={statusText} />
        </div>
      )}
      {!isGesture && (
        <div className="absolute bottom-6 right-6 rounded-full border border-gold/30 px-4 py-2 text-xs text-grey-purple">
          {statusText}
        </div>
      )}
    </div>
  )
}
