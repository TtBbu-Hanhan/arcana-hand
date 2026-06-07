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

// 洗牌后牌阵中每张牌的引用（按 deck index）
export type DeckSlot = {
  deckIndex: number // 指向 TAROT_DECK 的下标
  id: string
}

const POSITION_ORDER: SpreadPosition[] = ['situation', 'obstacle', 'advice']

// Fisher–Yates 洗牌
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
  deck: DeckSlot[] // 洗牌后排列的牌阵
  drawn: DrawnCard[] // 已放入卡位的牌（按放入顺序）

  result: ReadingResult | null
  isGenerating: boolean // 👈 新增：标记 AI 是否正在冥想生成解答

  // ---- actions ----
  setQuestion: (q: string) => void
  skipQuestion: () => void
  goToModeSelect: () => void
  chooseMode: (mode: InputMode) => void
  setCameraError: (msg: string | null) => void
  finishCalibration: () => void
  registerShuffleSwipe: () => void // 完成一次有效滑动
  drawCardToCurrentSlot: (deckIndex: number) => Orientation | null
  startRitual: () => void
  startReveal: () => void
  finishReveal: () => Promise<void> // 👈 修改：升级为异步函数
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
  isGenerating: false, // 👈 初始化状态

  setQuestion: (q) => set({ question: q }),

  skipQuestion: () => set({ question: '', phase: 'MODE_SELECT' }),

  goToModeSelect: () => set({ phase: 'MODE_SELECT' }),

  chooseMode: (mode) => {
    if (mode === 'gesture') {
      set({ mode, phase: 'CALIBRATION', cameraError: null })
    } else {
      // 无摄像头模式直接进入洗牌
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
      // 洗牌完成：重排牌阵并进入抽第一张
      set({ shuffleCount: SHUFFLE_TARGET, deck: shuffleDeck(), phase: 'DRAW_CARD_1' })
    } else {
      set({ shuffleCount: next, deck: shuffleDeck() })
    }
  },

  // 将牌阵中某张牌放入“当前卡位”。返回随机生成的正逆位，失败返回 null。
  drawCardToCurrentSlot: (deckIndex) => {
    const { phase, drawn, deck } = get()
    const slotIndex =
      phase === 'DRAW_CARD_1' ? 0 : phase === 'DRAW_CARD_2' ? 1 : phase === 'DRAW_CARD_3' ? 2 : -1
    if (slotIndex < 0) return null
    if (slotIndex !== drawn.length) return null // 防止乱序

    const slot = deck.find((d) => d.deckIndex === deckIndex)
    if (!slot) return null
    if (drawn.some((d) => d.cardId === slot.id)) return null // 同一张牌不可重复

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

  // 🛠️ 核心修改：接入专属塔罗占卜师 AI 接口
  finishReveal: async () => {
    const { question, drawn } = get()
    
    // 1. 进入加载状态，提升仪式感
    set({ isGenerating: true, phase: 'READING' })

    try {
      // 组装牌面文本信息发给 AI
      const cardsText = drawn.map(d => {
        const pos = d.position === 'situation' ? '【现状】' : d.position === 'obstacle' ? '【阻碍】' : '【建议】'
        return `${pos}: ${d.cardId} (${d.orientation === 'upright' ? '正位' : '逆位'})`
      }).join('\n')

      // 2. 发起专属占卜 API 请求
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_AI_API_KEY}` // 自动读取打包环境变量
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini', // 高性价比，且角色扮演极为契合
          response_format: { type: "json_object" }, // 强制模型输出标准的 JSON
          messages: [
            {
              role: 'system',
              content: `你是一位隐居于星空深处的灵视塔罗占卜师。你精通神秘学与古典塔罗牌意。
              你的说话风格神秘、优雅、充满仪式感，善于运用富有哲理和疗愈感的词汇（如：星辰的轨迹、能量的流动、命运的低语）。
              你将根据用户提供的问题和抽出的三张牌（现状、阻碍、建议），给出一段充满启发性的深度综合解读。
              
              请严格按照以下 JSON 格式回复，不要包含任何多余的解释文字：
              {
                "summary": "这里填写对整个牌阵的综合深度解读，字数在300字左右，语气要充满神秘占卜师的仪式感和灵性低语...",
                "finalAdvice": "这里填写你给求问者的具体行动指引与避坑建议，语气要坚定且富有疗愈感..."
              }`
            },
            {
              role: 'user',
              content: `求问者的问题："${question || '未明确具体提问，求问近期综合启示'}"\n\n抽出的牌阵数据：\n${cardsText}`
            }
          ]
        })
      })

      if (!response.ok) throw new Error('API 灵视通道连接失败')

      const data = await response.json()
      const aiResult = JSON.parse(data.choices[0].message.content)

      // 3. 成功拿到大仙的专属解答，安全送入结果页
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
      
      // 4. 兜底策略：如果遇到断网或密钥额度不足，一键无缝切回本地生成的解读，保证体验不中断！
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

// 当前应该抽第几个卡位（0/1/2），非抽牌阶段返回 -1
export function currentSlotIndex(phase: Phase): number {
  return phase === 'DRAW_CARD_1' ? 0 : phase === 'DRAW_CARD_2' ? 1 : phase === 'DRAW_CARD_3' ? 2 : -1
}