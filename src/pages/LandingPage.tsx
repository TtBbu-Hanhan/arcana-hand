import { useState } from 'react'
import { useArcanaStore } from '../store/tarotStore'
import { StarWheel } from '../components/StarWheel'
import { RitualButton } from '../components/RitualButton'
import { TarotCardView } from '../components/TarotCard'
import { TAROT_DECK } from '../data/tarotDeck'

// 页面一：首页（文档 §6.1）
export function LandingPage() {
  const goToQuestion = useArcanaStore((s) => s.jumpTo)
  const [showHelp, setShowHelp] = useState(false)

  // ⚠️ 核心修复：确保首页漂浮的卡片数据路径与结果页面的修复逻辑完全一致
  const floatCards = [TAROT_DECK[10], TAROT_DECK[17], TAROT_DECK[0]].map(card => {
    if (!card) return undefined
    return {
      ...card,
      imageUrl: card.imageUrl.startsWith('http')
        ? card.imageUrl
        : `${import.meta.env.BASE_URL}${card.imageUrl.replace(/^\//, '')}`
    }
  })

  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center px-6">
      {/* 背景星盘 */}
      <div className="anim-spin-slow pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-30">
        <StarWheel size={680} glow />
      </div>

      {/* 漂浮塔罗牌 */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {floatCards[0] && (
          <div className="anim-float absolute left-[14%] top-[24%]" style={{ animationDelay: '0s' }}>
            <TarotCardView card={floatCards[0]} faceUp orientation="upright" width={120} style={{ transform: 'rotate(-12deg)' }} />
          </div>
        )}
        {floatCards[1] && (
          <div className="anim-float absolute right-[15%] top-[20%]" style={{ animationDelay: '1.2s' }}>
            <TarotCardView card={floatCards[1]} faceUp orientation="upright" width={120} style={{ transform: 'rotate(10deg)' }} />
          </div>
        )}
        <div className="anim-float absolute bottom-[12%] left-1/2 -translate-x-1/2" style={{ animationDelay: '0.6s' }}>
          <TarotCardView width={120} style={{ transform: 'rotate(3deg)' }} />
        </div>
      </div>

      {/* 主文案 */}
      <div className="anim-fade-up relative z-10 flex flex-col items-center text-center">
        <p className="font-serif-en mb-3 text-sm tracking-[0.4em] text-gold/70">ARCANA HAND</p>
        <h1 className="font-serif-zh text-gold-gradient text-5xl font-semibold sm:text-6xl">
          灵视塔罗
        </h1>
        <p className="font-serif-zh mt-8 max-w-md text-lg leading-relaxed text-ivory/90">
          将手掌伸向命运之轮，
          <br />
          让三张牌回应你此刻的问题。
        </p>

        <div className="mt-12 flex flex-col items-center gap-4 sm:flex-row">
          <RitualButton onClick={() => goToQuestion('QUESTION_INPUT')}>开始占卜</RitualButton>
          <RitualButton variant="ghost" onClick={() => setShowHelp(true)}>
            查看操作方式
          </RitualButton>
        </div>
      </div>

      {showHelp && <HelpOverlay onClose={() => setShowHelp(false)} />}
    </div>
  )
}

function HelpOverlay({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="anim-fade-up fixed inset-0 z-40 flex items-center justify-center bg-black/70 px-6 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="max-w-lg rounded-2xl border border-gold/40 bg-bg-purple/90 p-8 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-serif-zh text-2xl text-gold-light">操作方式</h2>
        <ol className="mt-5 space-y-3 text-sm leading-relaxed text-ivory/85">
          <li>1. 输入你此刻想询问的问题（也可跳过）。</li>
          <li>2. 选择手势模式（摄像头）或无摄像头模式。</li>
          <li>
            3. <span className="text-gold">手势模式</span>：张开手掌左右滑动洗牌，食指拇指捏合选牌，移动到卡位后松开放下。
          </li>
          <li>
            4. <span className="text-gold">无摄像头模式</span>：鼠标左右拖动洗牌，按住卡牌拖到卡位后松开。
          </li>
          <li>5. 三张牌依次放入「现状 / 阻碍 / 建议」，仪式翻牌后获得解读。</li>
        </ol>
        <div className="mt-7 text-center">
          <RitualButton onClick={onClose}>我明白了</RitualButton>
        </div>
      </div>
    </div>
  )
}