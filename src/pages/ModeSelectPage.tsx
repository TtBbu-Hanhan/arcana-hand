import { useArcanaStore } from '../store/tarotStore'

// 页面三：模式选择页（文档 §6.3）
export function ModeSelectPage() {
  const chooseMode = useArcanaStore((s) => s.chooseMode)
  const cameraError = useArcanaStore((s) => s.cameraError)

  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center px-6">
      <div className="anim-fade-up relative z-10 w-full max-w-3xl text-center">
        <h1 className="font-serif-zh text-3xl text-gold-light sm:text-4xl">选择你的占卜方式</h1>
        <p className="mt-3 text-sm leading-relaxed text-grey-purple">
          你可以使用手势完成这场占卜，
          <br />
          也可以使用鼠标或触控继续体验。
        </p>

        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          <ModeCard
            title="手势模式"
            icon="✋"
            desc="使用摄像头识别手势，张开手掌洗牌、捏合手指抽牌。"
            onClick={() => chooseMode('gesture')}
            featured
          />
          <ModeCard
            title="无摄像头模式"
            icon="🖱"
            desc="使用鼠标或触控完成同样的洗牌与抽牌流程。"
            onClick={() => chooseMode('pointer')}
          />
        </div>

        {cameraError && (
          <p className="mt-6 text-sm text-warn-red/90">{cameraError}</p>
        )}

        <p className="mt-8 text-xs leading-relaxed text-grey-purple/80">
          摄像头画面仅用于本地手势识别，不会上传或保存。
        </p>
      </div>
    </div>
  )
}

function ModeCard({
  title,
  icon,
  desc,
  onClick,
  featured = false,
}: {
  title: string
  icon: string
  desc: string
  onClick: () => void
  featured?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={`transition-arcana group flex flex-col items-center rounded-2xl border bg-black/30 px-6 py-8 text-center hover:-translate-y-1 ${
        featured
          ? 'border-gold/60 hover:border-gold hover:shadow-[0_0_28px_rgba(214,181,109,0.4)]'
          : 'border-gold/30 hover:border-gold/70 hover:shadow-[0_0_22px_rgba(214,181,109,0.3)]'
      }`}
    >
      <span className="text-4xl">{icon}</span>
      <h2 className="font-serif-zh mt-4 text-xl text-gold-light">{title}</h2>
      <p className="mt-3 text-sm leading-relaxed text-ivory/75">{desc}</p>
    </button>
  )
}
