import { forwardRef } from 'react'

type CameraPreviewProps = {
  status?: string
  className?: string
  small?: boolean
}

// 摄像头预览小窗（文档 §6.5 右下角识别状态）
export const CameraPreview = forwardRef<HTMLVideoElement, CameraPreviewProps>(
  function CameraPreview({ status, className = '', small = false }, ref) {
    return (
      <div
        className={`overflow-hidden rounded-xl border border-gold/40 bg-black/50 backdrop-blur-sm ${
          small ? 'w-40' : 'w-56'
        } ${className}`}
      >
        <div className="relative">
          <video
            ref={ref}
            playsInline
            muted
            className="aspect-[4/3] w-full -scale-x-100 object-cover"
          />
          <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-gold/20" />
        </div>
        {status && (
          <div className="border-t border-gold/20 px-2 py-1 text-center text-[10px] text-grey-purple">
            {status}
          </div>
        )}
      </div>
    )
  },
)
