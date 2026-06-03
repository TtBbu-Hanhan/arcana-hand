// 摄像头模块：通过 getUserMedia 获取视频流（文档 §11.1）
// 画面仅用于本地手势识别，不上传、不保存。

export type CameraResult = {
  stream: MediaStream
  video: HTMLVideoElement
}

export type CameraErrorCode = 'unsupported' | 'denied' | 'notfound' | 'unknown'

export class CameraError extends Error {
  code: CameraErrorCode
  constructor(code: CameraErrorCode, message: string) {
    super(message)
    this.code = code
    this.name = 'CameraError'
  }
}

export async function startCamera(video: HTMLVideoElement): Promise<CameraResult> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new CameraError('unsupported', '当前浏览器不支持摄像头，已为你切换到无摄像头模式。')
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
      audio: false,
    })
    video.srcObject = stream
    await video.play().catch(() => {})
    return { stream, video }
  } catch (err) {
    const e = err as DOMException
    if (e.name === 'NotAllowedError' || e.name === 'SecurityError') {
      throw new CameraError('denied', '摄像头权限被拒绝，可切换到无摄像头模式继续占卜。')
    }
    if (e.name === 'NotFoundError' || e.name === 'DevicesNotFoundError') {
      throw new CameraError('notfound', '未找到可用摄像头，请检查设备或切换模式。')
    }
    throw new CameraError('unknown', '摄像头无法打开，请检查设备或切换模式。')
  }
}

export function stopCamera(stream: MediaStream | null): void {
  stream?.getTracks().forEach((t) => t.stop())
}
