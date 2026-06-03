// 占卜流程状态机阶段
export type Phase =
  | 'INIT'
  | 'QUESTION_INPUT'
  | 'MODE_SELECT'
  | 'CALIBRATION'
  | 'SHUFFLING'
  | 'DRAW_CARD_1'
  | 'DRAW_CARD_2'
  | 'DRAW_CARD_3'
  | 'RITUAL_PAUSE'
  | 'REVEALING'
  | 'READING'
  | 'RESULT'

// 交互模式
export type InputMode = 'gesture' | 'pointer'

// 卡位
export type SpreadPosition = 'situation' | 'obstacle' | 'advice'

// 正逆位
export type Orientation = 'upright' | 'reversed'

// 单张塔罗牌的静态数据
export type TarotCard = {
  id: string
  number: string // 罗马数字编号，如 "0" / "I" / "XXI"
  nameEn: string
  nameZh: string
  imageUrl: string
  keywords: string[]
  upright: {
    keywords: string[]
    meaning: string
    advice: string
  }
  reversed: {
    keywords: string[]
    meaning: string
    advice: string
  }
}

// 已抽出并放入卡位的牌
export type DrawnCard = {
  cardId: string
  position: SpreadPosition
  orientation: Orientation
}

// 最终占卜结果
export type ReadingResult = {
  question: string
  spread: 'situation_obstacle_advice'
  cards: DrawnCard[]
  summary: string
  finalAdvice: string
}

// 卡位元信息
export type SpreadSlot = {
  position: SpreadPosition
  labelZh: string
  meaningZh: string
}
