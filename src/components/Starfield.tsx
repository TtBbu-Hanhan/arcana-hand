import { useEffect, useRef } from 'react'

// Canvas 粒子星尘背景（文档 §12.4：粒子缓慢漂浮）
export function Starfield() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let raf = 0
    let w = 0
    let h = 0
    const DPR = Math.min(window.devicePixelRatio || 1, 2)

    type Star = { x: number; y: number; r: number; a: number; va: number; vy: number; hue: number }
    let stars: Star[] = []

    const resize = () => {
      w = window.innerWidth
      h = window.innerHeight
      canvas.width = w * DPR
      canvas.height = h * DPR
      canvas.style.width = w + 'px'
      canvas.style.height = h + 'px'
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0)
      const count = Math.min(180, Math.floor((w * h) / 9000))
      stars = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() * 1.6 + 0.3,
        a: Math.random() * 0.6 + 0.2,
        va: (Math.random() - 0.5) * 0.012,
        vy: -(Math.random() * 0.12 + 0.02),
        hue: Math.random() < 0.78 ? 44 : 265, // 金色 or 紫色
      }))
    }
    resize()
    window.addEventListener('resize', resize)

    const draw = () => {
      ctx.clearRect(0, 0, w, h)
      for (const s of stars) {
        s.a += s.va
        if (s.a < 0.12 || s.a > 0.85) s.va *= -1
        s.y += s.vy
        if (s.y < -4) {
          s.y = h + 4
          s.x = Math.random() * w
        }
        const color =
          s.hue === 44 ? `rgba(233, 206, 140, ${s.a})` : `rgba(156, 143, 180, ${s.a * 0.9})`
        ctx.beginPath()
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
        ctx.fillStyle = color
        ctx.shadowBlur = 6
        ctx.shadowColor = color
        ctx.fill()
      }
      ctx.shadowBlur = 0
      raf = requestAnimationFrame(draw)
    }
    draw()

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-0"
      aria-hidden="true"
    />
  )
}
