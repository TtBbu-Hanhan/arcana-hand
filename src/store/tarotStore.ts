import { create } from 'zustand'
import type {
  Phase,
  InputMode,
  SpreadPosition,
  Orientation,
  DrawnCard,
  ReadingResult,
} from '../types/tarot'
import { TAROT_DECK } from '../data/tarotDeck'
import { buildReading } from '../modules/tarot/readingService'

export type DeckSlot = {
  deckIndex: number
  id: string
}

const POSITION_ORDER: SpreadPosition[] = ['situation', 'obstacle', 'advice']

function shuffleDeck(): DeckSlot[] {
  const arr = TAROT_DECK.map((c, i) => ({ deckIndex: i, id: c.id }))
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

function randomOrientation(): Orientation {
  return Math.random() > 0.5 ? 'upright' : 'reversed'
}

type ArcanaState = {
  phase: Phase
  question: string
  mode: InputMode
  cameraError: string | null
  shuffleCount: number
  deck: DeckSlot[]
  drawn: DrawnCard[]
  result: ReadingResult | null
  isGenerating: boolean

  setQuestion: (q: string) => void
  skipQuestion: () => void
  goToModeSelect: () => void
  chooseMode: (mode: InputMode) => void
  setCameraError: (msg: string | null) => void
  finishCalibration: () => void
  registerShuffleSwipe: () => void
  drawCardToCurrentSlot: (deckIndex: number) => Orientation | null
  startRitual: () => void
  startReveal: () => void
  finishReveal: () => Promise<void>
  goToResult: () => void
  reset: () => void
  jumpTo: (phase: Phase) => void
}

export const SHUFFLE_TARGET = 3

export const useArcanaStore = create<ArcanaState>((set, get) => ({
  phase: 'INIT',
  question: '',
  mode: 'pointer',
  cameraError: null,
  shuffleCount: 0,
  deck: shuffleDeck(),
  drawn: [],
  result: null,
  isGenerating: false,

  setQuestion: (q) => set({ question: q }),
  skipQuestion: () => set({ question: '', phase: 'MODE_SELECT' }),
  goToModeSelect: () => set({ phase: 'MODE_SELECT' }),
  chooseMode: (mode) => {
    if (mode === 'gesture') {
      set({ mode, phase: 'CALIBRATION', cameraError: null })
    } else {
      set({ mode, phase: 'SHUFFLING', cameraError: null })
    }
  },
  setCameraError: (msg) => set({ cameraError: msg }),
  finishCalibration: () => set({ phase: 'SHUFFLING' }),

  registerShuffleSwipe: () => {
    const { shuffleCount, phase } = get()
    if (phase !== 'SHUFFLING') return
    const next = shuffleCount + 1
    if (next >= SHUFFLE_TARGET) {
      set({ shuffleCount: SHUFFLE_TARGET, deck: shuffleDeck(), phase: 'DRAW_CARD_1' })
    } else {
      set({ shuffleCount: next, deck: shuffleDeck() })
    }
  },

  drawCardToCurrentSlot: (deckIndex) => {
    const { phase, drawn, deck } = get()
    const slotIndex =
      phase === 'DRAW_CARD_1' ? 0 : phase === 'DRAW_CARD_2' ? 1 : phase === 'DRAW_CARD_3' ? 2 : -1
    if (slotIndex < 0) return null
    if (slotIndex !== drawn.length) return null

    const slot = deck.find((d) => d.deckIndex === deckIndex)
    if (!slot) return null
    if (drawn.some((d) => d.cardId === slot.id)) return null

    const orientation = randomOrientation()
    const newDrawn: DrawnCard = {
      cardId: slot.id,
      position: POSITION_ORDER[slotIndex],
      orientation,
    }
    const drawnNext = [...drawn, newDrawn]

    const nextPhase: Phase =
      drawnNext.length === 1
        ? 'DRAW_CARD_2'
        : drawnNext.length === 2
          ? 'DRAW_CARD_3'
          : 'RITUAL_PAUSE'

    set({ drawn: drawnNext, phase: nextPhase })
    return orientation
  },

  startRitual: () => set({ phase: 'RITUAL_PAUSE' }),
  startReveal: () => set({ phase: 'REVEALING' }),

  // 🔮 融合环境自适应判断的灵眸 AI 占卜核心逻辑
  finishReveal: async () => {
    const { question, drawn } = get()
    set({ isGenerating: true, phase: 'READING' })

    try {
      const cardsText = drawn.map(d => {
        const pos = d.position === 'situation' ? '【现状】' : d.position === 'obstacle' ? '【阻碍】' : '【建议】'
        return `${pos}: ${d.cardId} (${d.orientation === 'upright' ? '正位' : '逆位'})`
      }).join('\n')

      // ⚠️ 核心自适应逻辑：本地走 Vite 代理路由，线上直连灵眸官方域名
      // ⚠️ 终极修复：本地依然走完美流畅的 Vite 代理；线上由于灵眸拦截，我们直接给线上地址拼上跨域解封前缀！
      const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      const apiUrl = isLocal 
        ? '/lmu-api/v1/chat/completions' 
        : 'https://cors-anywhere.herokuapp.com/https://api.lmuai.com/v1/chat/completions' // 👈 线上地址前加上这个

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_AI_API_KEY}`,
          'X-Requested-With': 'XMLHttpRequest' // 👈 顺便在 headers 里面加上这行，防止有些代理服务器拦截
        },
      
        body: JSON.stringify({
          model: 'deepseek-v4-flash',
          response_format: { type: "json_object" }, 
          messages: [
            {
              role: 'system',
              content: `你是一位隐居于星空深处的灵视塔罗占卜师。你精通神秘学与古典塔罗牌意。
              你的说话风格神秘、优雅、充满仪式感，善于运用富有哲理和疗愈感的词汇（如：星辰的轨迹、能量的流动、命运的低语）。
              
              核心要求：
              在接下来的回答中，你必须化身为这位占卜师，直接与屏幕前的求问者对话。
              你的【summary（综合解读）】的第一句话，必须直接提及并正面回应求问者提出的具体问题（例如：“关于你所祈问的『...』，星盘的能量已经凝聚...”），严禁使用死板的牌意拼接套话！你要把三张牌作为一个整体的故事，来解答他这个核心问题。
              
              请严格按照以下 JSON 格式回复，不要包含任何多余的解释文字：
              {
                "summary": "这里填写你对这位求问者问题的专属深度综合解答，字数在300字左右，必须充满神秘占卜师一针见血又富有疗愈感的对话语气...",
                "finalAdvice": "这里填写你针对他的问题，给他的具体行动指引与避坑建议..."
              }`
            },
            {
              role: 'user',
              content: `求问者的问题："${question || '未明确具体提问，求问近期综合启示'}"\n\n抽出的牌阵数据：\n${cardsText}`
            }
          ]
        })
      })

      if (!response.ok) throw new Error('灵眸通道请求未成功')

      const data = await response.json()
      const aiResult = JSON.parse(data.choices[0].message.content)

      set({ 
        result: {
          question,
          spread: 'situation_obstacle_advice',
          cards: drawn,
          summary: aiResult.summary,
          finalAdvice: aiResult.finalAdvice
        }, 
        phase: 'RESULT',
        isGenerating: false
      })

    } catch (error) {
      console.error("💡 灵视连接意外中断，正在为您激活本地数据兜底保护:", error)
      const fallback = buildReading(question, drawn)
      set({ 
        result: fallback, 
        phase: 'RESULT',
        isGenerating: false 
      })
    }
  },

  goToResult: () => set({ phase: 'RESULT' }),
  reset: () =>
    set({
      phase: 'INIT',
      question: '',
      mode: 'pointer',
      cameraError: null,
      shuffleCount: 0,
      deck: shuffleDeck(),
      drawn: [],
      result: null,
      isGenerating: false,
    }),
  jumpTo: (phase) => set({ phase }),
}))

export function currentSlotIndex(phase: Phase): number {
  return phase === 'DRAW_CARD_1' ? 0 : phase === 'DRAW_CARD_2' ? 1 : phase === 'DRAW_CARD_3' ? 2 : -1
}