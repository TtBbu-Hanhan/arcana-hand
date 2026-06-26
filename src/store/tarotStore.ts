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

// 洗一副 78 张的完整牌组，返回带原始索引的牌位
function shuffleDeck(): DeckSlot[] {
  const arr = TAROT_DECK.map((c, i) => ({ deckIndex: i, id: c.id }))
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

// V0.2：把洗好的 78 张牌切成三堆，每堆 26 张
function buildPiles(): DeckSlot[][] {
  const full = shuffleDeck()
  return [full.slice(0, 26), full.slice(26, 52), full.slice(52, 78)]
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
  piles: DeckSlot[][] // V0.2：三堆切牌，每堆 26 张
  selectedPileIndex: number | null // V0.2：用户选中的牌堆下标
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
  choosePile: (pileIndex: number) => void // V0.2：确认选择某一堆
  drawCardToCurrentSlot: (deckIndex: number) => Orientation | null
  startRitual: () => void
  startReveal: () => void
  finishReveal: () => Promise<void>
  goToCardReadings: () => void // V0.2：进入单牌解读页
  goToAiSummary: () => void // V0.2：右滑进入综合解读页
  backToCardReadings: () => void // V0.2：左滑返回单牌解读页
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
  piles: [],
  selectedPileIndex: null,
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
      // V0.2：洗牌完成后不再直接抽牌，而是切成三堆进入选堆阶段
      set({ shuffleCount: SHUFFLE_TARGET, piles: buildPiles(), phase: 'CUT_DECK' })
    } else {
      set({ shuffleCount: next, deck: shuffleDeck() })
    }
  },

  // V0.2：确认选择某一牌堆，将该堆摊开作为抽牌牌阵
  choosePile: (pileIndex) => {
    const { phase, piles } = get()
    if (phase !== 'CUT_DECK' && phase !== 'CHOOSE_PILE') return
    const pile = piles[pileIndex]
    if (!pile) return
    set({
      selectedPileIndex: pileIndex,
      deck: pile, // 选中堆成为后续抽牌的牌阵
      phase: 'SPREAD_SELECTED_PILE',
    })
    // 短暂的摊牌过渡后进入抽第一张
    setTimeout(() => {
      const { phase: p } = get()
      if (p === 'SPREAD_SELECTED_PILE') set({ phase: 'DRAW_CARD_1' })
    }, 900)
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

  // V0.2：通过同域 Serverless 代理调用 DeepSeek 官方 API 生成综合解读。
  // 代理隐藏 API Key 且与前端同域，彻底规避浏览器 CORS 限制。
  finishReveal: async () => {
    const { question, drawn } = get()
    set({ isGenerating: true, phase: 'READING' })

    try {
      // 整理牌阵数据（携带中文牌名，提升解读质量）
      const cards = drawn.map((d) => {
        const card = TAROT_DECK.find((c) => c.id === d.cardId)
        return {
          position: d.position,
          nameZh: card?.nameZh ?? '',
          nameEn: card?.nameEn ?? d.cardId,
          orientation: d.orientation,
        }
      })

      const response = await fetch('/api/reading', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, cards }),
      })

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}))
        throw new Error(`解读代理返回错误 (HTTP ${response.status}) ${errBody?.error ?? ''}`)
      }

      const aiResult = await response.json()
      if (!aiResult.summary || !aiResult.finalAdvice) {
        throw new Error('解读代理返回缺少 summary / finalAdvice 字段')
      }

      console.info('🔮 AI 解读已生成', { summaryLen: aiResult.summary.length })
      set({
        result: {
          question,
          spread: 'situation_obstacle_advice',
          cards: drawn,
          summary: aiResult.summary,
          finalAdvice: aiResult.finalAdvice
        },
        phase: 'CARD_READINGS',
        isGenerating: false
      })

    } catch (error) {
      console.error("💡 灵视连接意外中断，正在为您激活本地数据兜底保护:", error)
      const fallback = buildReading(question, drawn)
      set({
        result: fallback,
        phase: 'CARD_READINGS',
        isGenerating: false
      })
    }
  },

  // V0.2：双页解读导航
  goToCardReadings: () => set({ phase: 'CARD_READINGS' }),
  goToAiSummary: () => {
    if (get().phase === 'CARD_READINGS') set({ phase: 'AI_SUMMARY' })
  },
  backToCardReadings: () => {
    if (get().phase === 'AI_SUMMARY') set({ phase: 'CARD_READINGS' })
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
      piles: [],
      selectedPileIndex: null,
      drawn: [],
      result: null,
      isGenerating: false,
    }),
  jumpTo: (phase) => set({ phase }),
}))

export function currentSlotIndex(phase: Phase): number {
  return phase === 'DRAW_CARD_1' ? 0 : phase === 'DRAW_CARD_2' ? 1 : phase === 'DRAW_CARD_3' ? 2 : -1
}