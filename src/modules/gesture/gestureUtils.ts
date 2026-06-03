import type { NormalizedLandmark } from '@mediapipe/tasks-vision'

// MediaPipe Hand Landmarker 关键点索引
export const LM = {
  WRIST: 0,
  THUMB_TIP: 4,
  INDEX_MCP: 5,
  INDEX_TIP: 8,
  MIDDLE_MCP: 9,
  MIDDLE_TIP: 12,
  RING_TIP: 16,
  PINKY_MCP: 17,
  PINKY_TIP: 20,
} as const

export function dist2d(a: NormalizedLandmark, b: NormalizedLandmark): number {
  const dx = a.x - b.x
  const dy = a.y - b.y
  return Math.sqrt(dx * dx + dy * dy)
}

// 手掌尺度：腕到中指根，用于把阈值归一化到手的大小
export function palmScale(lm: NormalizedLandmark[]): number {
  return Math.max(dist2d(lm[LM.WRIST], lm[LM.MIDDLE_MCP]), 0.0001)
}

// 捏合：拇指尖与食指尖距离相对手掌尺度足够小
export function isPinching(lm: NormalizedLandmark[]): boolean {
  const d = dist2d(lm[LM.THUMB_TIP], lm[LM.INDEX_TIP])
  return d / palmScale(lm) < 0.55
}

// 张开手掌：四指指尖都明显远离腕部（伸展）
export function isOpenPalm(lm: NormalizedLandmark[]): boolean {
  const scale = palmScale(lm)
  const tips = [LM.INDEX_TIP, LM.MIDDLE_TIP, LM.RING_TIP, LM.PINKY_TIP]
  const extended = tips.filter((t) => dist2d(lm[t], lm[LM.WRIST]) / scale > 1.4).length
  // 同时拇指食指不能是捏合状态
  return extended >= 3 && !isPinching(lm)
}

// 捏合点（拇指与食指中点），作为“手”的交互锚点
export function pinchPoint(lm: NormalizedLandmark[]): { x: number; y: number } {
  return {
    x: (lm[LM.THUMB_TIP].x + lm[LM.INDEX_TIP].x) / 2,
    y: (lm[LM.THUMB_TIP].y + lm[LM.INDEX_TIP].y) / 2,
  }
}

// 手掌中心（用中指根近似），用于判断左右滑动
export function palmCenter(lm: NormalizedLandmark[]): { x: number; y: number } {
  return { x: lm[LM.MIDDLE_MCP].x, y: lm[LM.MIDDLE_MCP].y }
}
