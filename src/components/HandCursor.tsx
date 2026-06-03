import { useEffect, useRef } from 'react'
import { pointer } from '../modules/input/pointerState'

// 跟随统一指针的金色光点（手势模式 = 手的捏合点；指针模式 = 鼠标）
// 直接操作 DOM transform，不触发 React 重渲染。
export function HandCursor({ enabled = true }: { enabled?: boolean }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!enabled) return
    let raf = 0
    const el = ref.current
    if (!el) return
    const loop = () => {
      const x = pointer.x * window.innerWidth
      const y = pointer.y * window.innerHeight
      el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%) scale(${
        pointer.grabbing ? 0.7 : 1
      })`
      el.style.opacity = pointer.present ? '1' : '0'
      el.style.background = pointer.grabbing
        ? 'radial-gradient(circle, rgba(244,235,208,0.95), rgba(214,181,109,0.5) 60%, transparent 75%)'
        : 'radial-gradient(circle, rgba(233,206,140,0.85), rgba(214,181,109,0.35) 55%, transparent 72%)'
      raf = requestAnimationFrame(loop)
    }
    loop()
    return () => cancelAnimationFrame(raf)
  }, [enabled])

  if (!enabled) return null

  return (
    <div
      ref={ref}
      className="pointer-events-none fixed left-0 top-0 z-50 h-10 w-10 rounded-full transition-[opacity] duration-200"
      style={{ boxShadow: '0 0 16px rgba(214,181,109,0.7)' }}
      aria-hidden="true"
    />
  )
}
