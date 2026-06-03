import { useEffect, useRef, useState } from 'react'
import { startCamera, stopCamera, CameraError } from './cameraService'
import {
  loadGestureModel,
  runGestureLoop,
  type HandFrame,
  EMPTY_FRAME,
} from './gestureService'
import { setPointer, resetPointer } from '../input/pointerState'

type SessionState = 'idle' | 'loading' | 'running' | 'error'

// 启动摄像头 + 手势识别，并把每帧手势写入统一指针状态。
// frameRef 暴露最新一帧，供页面读取 openPalm / palm 位移等细节。
export function useGestureSession(active: boolean, onError?: (err: CameraError) => void) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const frameRef = useRef<HandFrame>(EMPTY_FRAME)
  const streamRef = useRef<MediaStream | null>(null)
  const [state, setState] = useState<SessionState>('idle')

  useEffect(() => {
    if (!active) return
    let stopLoop: (() => void) | null = null
    let cancelled = false

    const begin = async () => {
      setState('loading')
      const video = videoRef.current
      if (!video) return
      try {
        const { stream } = await startCamera(video)
        if (cancelled) {
          stopCamera(stream)
          return
        }
        streamRef.current = stream
        await loadGestureModel()
        if (cancelled) return
        setState('running')
        stopLoop = runGestureLoop(video, (frame) => {
          frameRef.current = frame
          // 捏合点驱动统一指针；present 用手是否存在
          setPointer({
            x: frame.pinch.x,
            y: frame.pinch.y,
            present: frame.present,
            grabbing: frame.pinching,
          })
        })
      } catch (err) {
        if (cancelled) return
        setState('error')
        if (err instanceof CameraError) onError?.(err)
        else onError?.(new CameraError('unknown', '手势识别初始化失败，请切换无摄像头模式。'))
      }
    }
    begin()

    return () => {
      cancelled = true
      stopLoop?.()
      stopCamera(streamRef.current)
      streamRef.current = null
      resetPointer()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active])

  return { videoRef, frameRef, state }
}
