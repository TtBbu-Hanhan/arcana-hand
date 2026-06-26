import { useEffect, useRef, useState, useCallback } from 'react'
import { useArcanaStore, SHUFFLE_TARGET } from '../store/tarotStore'
import { useGestureSession } from '../modules/gesture/useGestureSession'
import { CameraPreview } from '../components/CameraPreview'
import { TarotCardView } from '../components/TarotCard'
import { StarWheel } from '../components/StarWheel'
import { audioManager } from '../utils/audioManager'

const SWIPE_THRESHOLD = 0.22
const CARD_COUNT = 11
const CARD_W = 120
const RADIUS = 300 // 牌环半径 px
const IDLE_SPEED = 0.004 // 待机旋转速度 rad/frame
const DAMPING = 0.96 // 阻尼系数

// 页面五：洗牌页 — 3D 圆柱式旋转牌环
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
  const [rotation, setRotation] = useState(0)
  const [glowActive, setGlowActive] = useState(false)

  // 物理状态
  const rotationRef = useRef(0)
  const velocityRef = useRef(0)
  const completingRef = useRef(false)
  const completeAngleRef = useRef(0)

  // 手势洗牌检测
  const swipeOrigin = useRef<number | null>(null)
  const lastDir = useRef<0 | 1 | -1>(0)
  const cooldownRef = useRef(false)

  // 指针洗牌检测
  const dragStart = useRef<number | null>(null)
  const dragDir = useRef<0 | 1 | -1>(0)

  const triggerSwipe = useCallback(() => {
    if (cooldownRef.current) return
    cooldownRef.current = true
    registerSwipe()
    audioManager.play('shuffle-paper')
    setGlowActive(true)
    setTimeout(() => setGlowActive(false), 450)
    setTimeout(() => (cooldownRef.current = false), 700)
  }, [registerSwipe])

  // 主动画循环
  useEffect(() => {
    let raf = 0
    const loop = () => {
      if (completingRef.current) {
        // 完成阶段：快速旋转一圈
        const remaining = completeAngleRef.current - rotationRef.current
        if (remaining <= 0.01) {
          completingRef.current = false
          // 确保最终注册一次洗牌（如果还没到目标）
          if (shuffleCount < SHUFFLE_TARGET - 1) {
            // 不应该到这里，但保险起见
          }
        } else {
          // 快速旋转，带减速
          const step = Math.max(0.08, remaining * 0.12)
          rotationRef.current += step
        }
      } else {
        // 正常旋转
        if (Math.abs(velocityRef.current) > 0.0001) {
          rotationRef.current += velocityRef.current
          velocityRef.current *= DAMPING
        } else {
          velocityRef.current = 0
          rotationRef.current += IDLE_SPEED
        }
      }
      setRotation(rotationRef.current)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 完成洗牌时的快速旋转
  useEffect(() => {
    if (shuffleCount >= SHUFFLE_TARGET && !completingRef.current) {
      completingRef.current = true
      completeAngleRef.current = rotationRef.current + Math.PI * 2.5
      velocityRef.current = 0
    }
  }, [shuffleCount])

  // 手势检测循环（仅读取 palm.x，不触发 React 重渲染）
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
            velocityRef.current += dir * 0.06 // 给牌环加速
            triggerSwipe()
          }
          swipeOrigin.current = x
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

  // 指针事件
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
        velocityRef.current += dir * 0.06
        triggerSwipe()
      }
      dragStart.current = e.clientX
    }
  }
  const onPointerUp = () => {
    dragStart.current = null
  }

  // 计算每张卡牌的样式
  const carouselCardStyle = (index: number): React.CSSProperties => {
    const baseAngle = (index / CARD_COUNT) * Math.PI * 2
    const angle = baseAngle + rotation
    const z = Math.cos(angle) * RADIUS

    // 深度 -> 视觉参数
    const depthNorm = (z + RADIUS) / (2 * RADIUS) // 0=最远, 1=最近
    const scale = 0.55 + depthNorm * 0.5
    const opacity = 0.25 + depthNorm * 0.75
    const brightness = 0.5 + depthNorm * 0.5
    const zIndexVal = Math.round(depthNorm * 100)

    // 屏幕 X 偏移（sin 映射到水平位置，带透视偏移增强 3D 感）
    const screenX = Math.sin(angle) * (RADIUS * 0.72)
    const floatOffset = Math.sin(baseAngle * 2 + rotation * 1.5) * 5
    const screenY = -z * 0.12 + floatOffset // 远牌稍上移

    return {
      position: 'absolute',
      transform: `translateX(${screenX}px) translateY(${screenY}px) scale(${scale})`,
      zIndex: zIndexVal,
      opacity,
      filter: `brightness(${brightness})${glowActive && depthNorm > 0.5 ? ' drop-shadow(0 0 6px rgba(214,181,109,0.5))' : ''}`,
      transition: glowActive ? 'filter 0.3s ease-out' : undefined,
    }
  }

  const statusText = isGesture
    ? state === 'loading'
      ? '识别模型加载中…'
      : openPalm
        ? '手掌已张开，左右滑动'
        : '请张开手掌'
    : '按住并左右拖动'

  return (
    <div
      className="relative flex h-full w-full touch-none flex-col items-center justify-between py-10"
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

      {/* 3D 牌环 + 中央星盘 */}
      <div
        className="relative flex h-[380px] w-full items-center justify-center overflow-hidden"
        style={{ perspective: '1200px' }}
      >
        {/* 中央星盘 */}
        <div
          className="absolute pointer-events-none anim-pulse-glow"
          style={{
            opacity: 0.25,
            transform: `rotate(${rotation * 0.3}rad)`,
          }}
        >
          <StarWheel size={260} glow={false} />
        </div>

        {/* 卡牌牌环 */}
        {Array.from({ length: CARD_COUNT }).map((_, i) => (
          <div key={i} style={carouselCardStyle(i)}>
            <TarotCardView width={CARD_W} />
          </div>
        ))}
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
