import { useEffect, useRef, useState } from 'react'
import { useArcanaStore } from '../store/tarotStore'
import { useGestureSession } from '../modules/gesture/useGestureSession'
import { StarWheel } from '../components/StarWheel'
import { CameraPreview } from '../components/CameraPreview'
import { RitualButton } from '../components/RitualButton'

const STABLE_MS = 3000 // 连续稳定识别 3 秒
const TIMEOUT_MS = 8000 // 超过 8 秒未识别提示切换

// 页面四：3 秒手势校准页（文档 §6.4）
export function CalibrationPage() {
  const finishCalibration = useArcanaStore((s) => s.finishCalibration)
  const chooseMode = useArcanaStore((s) => s.chooseMode)
  const setCameraError = useArcanaStore((s) => s.setCameraError)
  const goModeSelect = useArcanaStore((s) => s.goToModeSelect)

  const { videoRef, frameRef, state } = useGestureSession(true, (err) => {
    setCameraError(err.message)
    goModeSelect()
  })

  const [countdown, setCountdown] = useState(3)
  const [handDetected, setHandDetected] = useState(false)
  const [timedOut, setTimedOut] = useState(false)
  const stableSince = useRef<number | null>(null)
  const startedAt = useRef<number>(performance.now())

  useEffect(() => {
    let raf = 0
    const loop = () => {
      const present = frameRef.current.present
      setHandDetected(present)
      const now = performance.now()

      if (present) {
        if (stableSince.current === null) stableSince.current = now
        const held = now - stableSince.current
        const remain = Math.ceil((STABLE_MS - held) / 1000)
        setCountdown(Math.max(0, remain))
        if (held >= STABLE_MS) {
          finishCalibration()
          return
        }
      } else {
        stableSince.current = null
        setCountdown(3)
        if (now - startedAt.current > TIMEOUT_MS) {
          setTimedOut(true)
        }
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const statusText =
    state === 'loading'
      ? '正在唤醒摄像头与识别模型……'
      : handDetected
        ? '已识别到手部'
        : '请将手掌放入画面中央'

  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center px-6">
      {/* 中央星盘识别区域 */}
      <div className="relative flex flex-col items-center">
        <div className={`relative ${handDetected ? 'anim-pulse-glow' : ''}`}>
          <div className={handDetected ? 'anim-spin-slow' : ''}>
            <StarWheel size={360} glow={handDetected} />
          </div>
          {/* 手部光点轮廓 / 倒计时 */}
          <div className="absolute inset-0 flex items-center justify-center">
            {handDetected ? (
              <div className="text-center">
                <div className="font-serif-en text-6xl text-gold-light">{countdown || 0}</div>
                <div className="mt-2 text-xs tracking-widest text-gold/80">金色光点已锁定</div>
              </div>
            ) : (
              <div className="h-16 w-16 rounded-full border-2 border-dashed border-gold/40" />
            )}
          </div>
        </div>

        <p className="font-serif-zh mt-10 text-center text-lg leading-relaxed text-ivory/90">
          请将手掌放入星盘中央。
          <br />
          识别完成后，仪式将正式开始。
        </p>
        <p className="mt-2 text-sm text-grey-purple">{statusText}</p>

        {timedOut && (
          <div className="anim-fade-up mt-6 flex flex-col items-center gap-3">
            <p className="text-sm text-warn-red/90">识别似乎遇到困难，可切换至无摄像头模式继续。</p>
            <RitualButton variant="ghost" onClick={() => chooseMode('pointer')}>
              切换无摄像头模式
            </RitualButton>
          </div>
        )}
      </div>

      {/* 摄像头预览小窗 */}
      <div className="absolute bottom-6 right-6">
        <CameraPreview ref={videoRef} small status={handDetected ? '手部已锁定' : '寻找手部…'} />
      </div>
    </div>
  )
}
