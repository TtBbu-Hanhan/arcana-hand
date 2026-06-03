import { useState } from 'react'
import { useArcanaStore } from '../store/tarotStore'
import { StarWheel } from '../components/StarWheel'
import { RitualButton } from '../components/RitualButton'

const EXAMPLES = [
  '我最近的学习状态如何？',
  '我应该如何面对当前的选择？',
  '这段关系接下来会怎样？',
  '我现在最需要注意什么？',
]

// 页面二：问题输入页（文档 §6.2）
export function QuestionPage() {
  const setQuestion = useArcanaStore((s) => s.setQuestion)
  const goToModeSelect = useArcanaStore((s) => s.goToModeSelect)
  const skipQuestion = useArcanaStore((s) => s.skipQuestion)
  const stored = useArcanaStore((s) => s.question)
  const [value, setValue] = useState(stored)

  const next = () => {
    setQuestion(value)
    goToModeSelect()
  }

  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center px-6">
      <div className="anim-spin-reverse pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-15">
        <StarWheel size={560} />
      </div>

      <div className="anim-fade-up relative z-10 w-full max-w-xl text-center">
        <h1 className="font-serif-zh text-3xl text-gold-light sm:text-4xl">你想向牌阵询问什么？</h1>
        <p className="mt-3 text-sm text-grey-purple">带着一个明确的问题，让占卜更有回应。</p>

        <div className="mt-8">
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="请输入你此刻想询问的问题……"
            rows={3}
            className="font-serif-zh w-full resize-none rounded-2xl border border-gold/40 bg-black/30 px-6 py-4 text-center text-lg text-ivory placeholder:text-grey-purple/60 focus:border-gold focus:outline-none focus:shadow-[0_0_18px_rgba(214,181,109,0.35)]"
          />
        </div>

        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              onClick={() => setValue(ex)}
              className="transition-arcana rounded-full border border-gold/25 px-4 py-1.5 text-xs text-grey-purple hover:border-gold/60 hover:text-gold"
            >
              {ex}
            </button>
          ))}
        </div>

        <div className="mt-10 flex items-center justify-center gap-4">
          <RitualButton variant="ghost" onClick={skipQuestion}>
            跳过
          </RitualButton>
          <RitualButton onClick={next}>下一步</RitualButton>
        </div>
      </div>
    </div>
  )
}
