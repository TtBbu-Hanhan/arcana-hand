// 统一指针状态：手势模式与鼠标/触控模式都写入这里，
// 页面通过 requestAnimationFrame 循环读取，避免 60fps 触发 React 重渲染。
// 坐标为视口归一化 [0,1]，x 向右增大，y 向下增大。

export type PointerSnapshot = {
  x: number
  y: number
  present: boolean // 手势模式：是否检测到手；指针模式：指针是否在窗口内
  grabbing: boolean // 手势模式：是否捏合；指针模式：是否按下
}

export const pointer: PointerSnapshot = {
  x: 0.5,
  y: 0.5,
  present: false,
  grabbing: false,
}

export function setPointer(next: Partial<PointerSnapshot>): void {
  if (next.x !== undefined) pointer.x = next.x
  if (next.y !== undefined) pointer.y = next.y
  if (next.present !== undefined) pointer.present = next.present
  if (next.grabbing !== undefined) pointer.grabbing = next.grabbing
}

export function resetPointer(): void {
  pointer.x = 0.5
  pointer.y = 0.5
  pointer.present = false
  pointer.grabbing = false
}
