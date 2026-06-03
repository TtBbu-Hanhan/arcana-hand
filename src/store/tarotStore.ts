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
  finishReveal: () => void
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

  finishReveal: () => {
    const { question, drawn } = get()
    const result = buildReading(question, drawn)
    set({ result, phase: 'READING' })
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
    }),

  jumpTo: (phase) => set({ phase }),
}))

// 当前应该抽第几个卡位（0/1/2），非抽牌阶段返回 -1
export function currentSlotIndex(phase: Phase): number {
  return phase === 'DRAW_CARD_1' ? 0 : phase === 'DRAW_CARD_2' ? 1 : phase === 'DRAW_CARD_3' ? 2 : -1
}
