import {
  HandLandmarker,
  FilesetResolver,
  type HandLandmarkerResult,
  type NormalizedLandmark,
} from '@mediapipe/tasks-vision'
import { isOpenPalm, isPinching, pinchPoint, palmCenter } from './gestureUtils'

// 模型文件本地托管（npm 包不含 .task，故始终用本地副本，已随构建发布到 /models）。
const MODEL_URL = `${import.meta.env.BASE_URL}models/hand_landmarker.task`
// WASM 运行时：优先 jsdelivr CDN（MIME 正确、稳定），本地副本作为离线兜底。
const WASM_BASE_CDN =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm'
const WASM_BASE_LOCAL = `${import.meta.env.BASE_URL}mediapipe-wasm`

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

// 给单次加载尝试套上超时：若 WASM/模型在限定时间内没加载成功（卡住不报错），
// 主动判失败以触发下一套兜底方案，避免 UI 永远停在“加载中”。
function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} 加载超时(${ms}ms)`)), ms)
    p.then(
      (v) => {
        clearTimeout(timer)
        resolve(v)
      },
      (e) => {
        clearTimeout(timer)
        reject(e)
      },
    )
  })
}

export async function loadGestureModel(): Promise<HandLandmarker> {
  if (landmarker) return landmarker
  // 模型始终走本地；WASM 优先 CDN（MIME 可靠）→ 本地兜底。
  // 每套方案带超时，任一步卡住即快速降级，保证不会永远停在“加载中”。
  const attempts: Array<[string, 'GPU' | 'CPU', number]> = [
    [WASM_BASE_CDN, 'GPU', 12000],
    [WASM_BASE_CDN, 'CPU', 12000],
    [WASM_BASE_LOCAL, 'GPU', 15000],
    [WASM_BASE_LOCAL, 'CPU', 15000],
  ]
  let lastErr: unknown = null
  for (const [wasm, delegate, timeout] of attempts) {
    const where = wasm.includes('http') ? 'CDN' : '本地'
    try {
      landmarker = await withTimeout(
        tryCreate(wasm, MODEL_URL, delegate),
        timeout,
        `手势模型(${where}/${delegate})`,
      )
      console.info(`✓ 手势模型加载成功（WASM=${where}, ${delegate}）`)
      return landmarker
    } catch (err) {
      lastErr = err
      console.warn(`手势模型加载失败（WASM=${where}, ${delegate}），尝试下一方案`, err)
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
