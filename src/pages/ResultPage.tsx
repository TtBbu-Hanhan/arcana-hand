import { useArcanaStore } from '../store/tarotStore'
import { TarotCardView } from '../components/TarotCard'
import { RitualButton } from '../components/RitualButton'
import { StarWheel } from '../components/StarWheel'
import { SPREAD_SLOTS } from '../data/tarotDeck'
import {
  getCard,
  positionLabel,
  orientationLabel,
} from '../modules/tarot/readingService'

// 页面八：结果页（文档 §10.3）—— 用户问题 / 三张牌 / 单牌解读 / 综合建议
export function ResultPage() {
  const result = useArcanaStore((s) => s.result)
  const reset = useArcanaStore((s) => s.reset)

  if (!result) {
    return (
      <div className="flex h-full w-full items-center justify-center text-grey-purple">
        正在生成解读……
      </div>
    )
  }

  // 按 现状 / 阻碍 / 建议 顺序展示
  const ordered = SPREAD_SLOTS.map((slot) => {
    const d = result.cards.find((c) => c.position === slot.position)
    return d ? { drawn: d, card: getCard(d.cardId)! } : null
  }).filter((x): x is { drawn: NonNullable<typeof x>['drawn']; card: NonNullable<typeof x>['card'] } => x !== null)

  return (
    <div className="relative h-full w-full overflow-y-auto">
      <div className="anim-spin-reverse pointer-events-none fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-10">
        <StarWheel size={760} />
      </div>

      <div className="relative z-10 mx-auto max-w-4xl px-6 py-14">
        {/* 标题 */}
        <div className="anim-fade-up text-center">
          <p className="font-serif-en text-xs tracking-[0.4em] text-gold/60">YOUR READING</p>
          <h1 className="font-serif-zh mt-3 text-3xl text-gold-light">你的三张牌已经回应了这个问题</h1>
        </div>

        {/* 1. 用户问题 */}
        <div className="anim-unfurl mt-10 rounded-2xl border border-gold/30 bg-black/30 px-6 py-5 text-center">
          <p className="text-xs tracking-widest text-grey-purple">你的问题</p>
          <p className="font-serif-zh mt-2 text-lg text-ivory">
            {result.question ? result.question : '本次占卜问题：未填写'}
          </p>
        </div>

        {/* 2. 三张牌 */}
        <div className="mt-10 flex flex-wrap items-start justify-center gap-8">
          {ordered.map(({ drawn, card }, i) => (
            <div
              key={drawn.position}
              className="anim-fade-up flex flex-col items-center"
              style={{ animationDelay: `${i * 0.15}s` }}
            >
              <span className="font-serif-zh mb-3 rounded-full border border-gold/40 px-4 py-1 text-sm text-gold">
                {positionLabel(drawn.position)}
              </span>
              <TarotCardView
                card={card}
                faceUp
                orientation={drawn.orientation}
                width={150}
                showLabel
              />
            </div>
          ))}
        </div>

        {/* 3. 单牌解读 */}
        <div className="mt-12 space-y-5">
          {ordered.map(({ drawn, card }, i) => (
            <div
              key={drawn.position}
              className="anim-fade-up rounded-2xl border border-gold/25 bg-black/25 p-6"
              style={{ animationDelay: `${0.4 + i * 0.12}s` }}
            >
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="font-serif-zh text-lg text-gold-light">
                  {positionLabel(drawn.position)}
                </span>
                <span className="font-serif-zh text-xl text-ivory">{card.nameZh}</span>
                <span className="font-serif-en text-sm text-grey-purple">{card.nameEn}</span>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs ${
                    drawn.orientation === 'upright'
                      ? 'bg-gold/15 text-gold'
                      : 'bg-warn-red/20 text-warn-red'
                  }`}
                >
                  {orientationLabel(drawn.orientation)}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {card[drawn.orientation].keywords.map((k) => (
                  <span key={k} className="rounded-full bg-grey-purple/15 px-2.5 py-0.5 text-xs text-grey-purple">
                    {k}
                  </span>
                ))}
              </div>
              <p className="mt-3 text-sm leading-relaxed text-ivory/85">
                {card[drawn.orientation].meaning}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-gold/85">
                <span className="text-gold">提醒：</span>
                {card[drawn.orientation].advice}
              </p>
            </div>
          ))}
        </div>

        {/* 4. 综合建议 */}
        <div className="anim-unfurl mt-10 rounded-2xl border border-gold/40 bg-gradient-to-b from-gold/10 to-transparent p-7">
          <h2 className="font-serif-zh text-xl text-gold-light">综合解读</h2>
          <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-ivory/90">
            {result.summary}
          </p>
          <div className="mt-5 border-t border-gold/20 pt-5">
            <p className="font-serif-zh text-sm text-gold">给你的行动建议</p>
            <p className="mt-2 text-sm leading-relaxed text-ivory/90">{result.finalAdvice}</p>
          </div>
        </div>

        {/* 重新占卜 */}
        <div className="mt-12 text-center">
          <RitualButton onClick={reset}>重新占卜</RitualButton>
        </div>

        <p className="mt-10 text-center text-xs leading-relaxed text-grey-purple/60">
          塔罗解读仅供自我觉察与娱乐参考，重要决定请结合现实判断。
          <br />
          牌面图像采用公有领域 Rider-Waite-Smith 牌组。
        </p>
      </div>
    </div>
  )
}
