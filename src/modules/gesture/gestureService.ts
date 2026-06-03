import {
  HandLandmarker,
  FilesetResolver,
  type HandLandmarkerResult,
  type NormalizedLandmark,
} from '@mediapipe/tasks-vision'
import { isOpenPalm, isPinching, pinchPoint, palmCenter } from './gestureUtils'

// 通过 CDN 加载 WASM 与模型（MVP 阶段省去本地托管模型文件）
const WASM_BASE =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm'
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task'

export type HandFrame = {
  present: boolean
  landmarks: NormalizedLandmark[] | null
  openPalm: boolean
  pinching: boolean
  pinch: { x: number; y: number } // 归一化、已做镜像翻转（与用户视角一致）
  palm: { x: number; y: number }
}

export const EMPTY_FRAME: HandFrame = {
  present: false,
  landmarks: null,
  openPalm: false,
  pinching: false,
  pinch: { x: 0.5, y: 0.5 },
  palm: { x: 0.5, y: 0.5 },
}

let landmarker: HandLandmarker | null = null

export async function loadGestureModel(): Promise<HandLandmarker> {
  if (landmarker) return landmarker
  const vision = await FilesetResolver.forVisionTasks(WASM_BASE)
  landmarker = await HandLandmarker.createFromOptions(vision, {
    baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' },
    runningMode: 'VIDEO',
    numHands: 1,
  })
  return landmarker
}

// 持续检测循环。回调每帧收到一个 HandFrame。返回 stop 函数。
export function runGestureLoop(
  video: HTMLVideoElement,
  onFrame: (frame: HandFrame) => void,
): () => void {
  let raf = 0
  let lastVideoTime = -1
  let stopped = false

  const tick = () => {
    if (stopped) return
    if (landmarker && video.readyState >= 2 && video.currentTime !== lastVideoTime) {
      lastVideoTime = video.currentTime
      let result: HandLandmarkerResult | null = null
      try {
        result = landmarker.detectForVideo(video, performance.now())
      } catch {
        result = null
      }
      if (result && result.landmarks.length > 0) {
        const lm = result.landmarks[0]
        const rawPinch = pinchPoint(lm)
        const rawPalm = palmCenter(lm)
        onFrame({
          present: true,
          landmarks: lm,
          openPalm: isOpenPalm(lm),
          pinching: isPinching(lm),
          // 摄像头画面为镜像，x 取反让左右与用户直觉一致
          pinch: { x: 1 - rawPinch.x, y: rawPinch.y },
          palm: { x: 1 - rawPalm.x, y: rawPalm.y },
        })
      } else {
        onFrame(EMPTY_FRAME)
      }
    }
    raf = requestAnimationFrame(tick)
  }
  raf = requestAnimationFrame(tick)

  return () => {
    stopped = true
    cancelAnimationFrame(raf)
  }
}

export function disposeGestureModel(): void {
  landmarker?.close()
  landmarker = null
}
