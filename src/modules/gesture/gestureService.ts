import {
  HandLandmarker,
  FilesetResolver,
  type HandLandmarkerResult,
  type NormalizedLandmark,
} from '@mediapipe/tasks-vision'
import { isOpenPalm, isPinching, pinchPoint, palmCenter } from './gestureUtils'

// 本地托管 WASM 与模型，避免依赖 storage.googleapis.com / CDN（国内网络常被阻断）。
// 用 BASE_URL 前缀以适配 GitHub Pages 子目录部署。
const WASM_BASE = `${import.meta.env.BASE_URL}mediapipe-wasm`
const MODEL_URL = `${import.meta.env.BASE_URL}models/hand_landmarker.task`
// CDN 兜底：若本地资源缺失则回退到公网
const WASM_BASE_FALLBACK =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm'
const MODEL_URL_FALLBACK =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/models/hand_landmarker.task'

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

// 尝试用给定的 wasm/model 与 delegate 创建识别器
async function tryCreate(
  wasmBase: string,
  modelUrl: string,
  delegate: 'GPU' | 'CPU',
): Promise<HandLandmarker> {
  const vision = await FilesetResolver.forVisionTasks(wasmBase)
  return HandLandmarker.createFromOptions(vision, {
    baseOptions: { modelAssetPath: modelUrl, delegate },
    runningMode: 'VIDEO',
    numHands: 1,
  })
}

export async function loadGestureModel(): Promise<HandLandmarker> {
  if (landmarker) return landmarker
  // 依次尝试：本地GPU → 本地CPU → CDN GPU → CDN CPU，任何一步成功即返回
  const attempts: Array<[string, string, 'GPU' | 'CPU']> = [
    [WASM_BASE, MODEL_URL, 'GPU'],
    [WASM_BASE, MODEL_URL, 'CPU'],
    [WASM_BASE_FALLBACK, MODEL_URL_FALLBACK, 'GPU'],
    [WASM_BASE_FALLBACK, MODEL_URL_FALLBACK, 'CPU'],
  ]
  let lastErr: unknown = null
  for (const [wasm, model, delegate] of attempts) {
    try {
      landmarker = await tryCreate(wasm, model, delegate)
      return landmarker
    } catch (err) {
      lastErr = err
      console.warn(`手势模型加载失败（wasm=${wasm.includes('http') ? 'CDN' : '本地'}, ${delegate}），尝试下一方案`, err)
    }
  }
  throw lastErr ?? new Error('手势识别模型加载失败')
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
