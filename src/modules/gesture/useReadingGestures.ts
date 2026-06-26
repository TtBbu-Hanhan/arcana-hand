import { useEffect, useRef } from 'react'
import type { HandFrame } from './gestureService'

// V0.2 解读页手势：张开手掌左右滑动切页、上下滑动滚动内容。
// 阈值与冷却遵循产品规格：横向位移 > 画面宽度约 20%，每次切换后约 800ms 冷却。
const SWIPE_THRESHOLD = 0.2 // 横向位移阈值（归一化，画面宽度的 20%）
const SWIPE_COOLDOWN_MS = 800 // 切换后冷却
const SCROLL_GAIN = 1.4 // 手掌纵向位移 → 像素滚动增益

type Options = {
  active: boolean // 仅在该页处于活动状态时启用（手势含义随状态变化）
  frameRef: React.RefObject<HandFrame>
  scrollRef: React.RefObject<HTMLElement | null>
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
}

// 注意：frame.palm.x 已在 gestureService 中做过镜像翻转，
// 因此用户在屏幕上向右移动手，palm.x 增大，方向与直觉一致。
export function useReadingGestures({ active, frameRef, scrollRef, onSwipeLeft, onSwipeRight }: Options) {
  const swipeOrigin = useRef<number | null>(null)
  const cooldownUntil = useRef(0)
  const lastPalmY = useRef<number | null>(null)
  const cbLeft = useRef(onSwipeLeft)
  const cbRight = useRef(onSwipeRight)
  cbLeft.current = onSwipeLeft
  cbRight.current = onSwipeRight

  useEffect(() => {
    if (!active) return
    let raf = 0
    const loop = () => {
      const f = frameRef.current
      const now = performance.now()

      if (f && f.present && f.openPalm) {
        // 横向滑动切页
        const x = f.palm.x
        const origin = swipeOrigin.current ?? x
        swipeOrigin.current = origin
        const dx = x - origin
        if (now >= cooldownUntil.current && Math.abs(dx) > SWIPE_THRESHOLD) {
          if (dx > 0) cbRight.current?.()
          else cbLeft.current?.()
          cooldownUntil.current = now + SWIPE_COOLDOWN_MS
          swipeOrigin.current = x // 重置基准，避免连续误触
        }

        // 纵向滑动滚动内容
        const y = f.palm.y
        if (lastPalmY.current !== null && scrollRef.current) {
          const dy = y - lastPalmY.current
          scrollRef.current.scrollTop += dy * window.innerHeight * SCROLL_GAIN
        }
        lastPalmY.current = y
      } else {
        swipeOrigin.current = null
        lastPalmY.current = null
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [active, frameRef, scrollRef])
}
