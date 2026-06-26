// 占卜流程状态机阶段
export type Phase =
  | 'INIT'
  | 'QUESTION_INPUT'
  | 'MODE_SELECT'
  | 'CALIBRATION'
  | 'SHUFFLING'
  | 'CUT_DECK' // 洗牌后：78 张切成三堆（V0.2）
  | 'CHOOSE_PILE' // 悬停+捏合选择其中一堆（V0.2）
  | 'SPREAD_SELECTED_PILE' // 选中堆摊成扇形（V0.2，过渡）
  | 'DRAW_CARD_1'
  | 'DRAW_CARD_2'
  | 'DRAW_CARD_3'
  | 'RITUAL_PAUSE'
  | 'REVEALING'
  | 'READING'
  | 'CARD_READINGS' // 单牌解读页（V0.2）
  | 'AI_SUMMARY' // AI 综合解读页（V0.2）
  | 'RESULT'

// 交互模式
export type InputMode = 'gesture' | 'pointer'

// 卡位
export type SpreadPosition = 'situation' | 'obstacle' | 'advice'

// 正逆位
export type Orientation = 'upright' | 'reversed'

// 牌组类别与小阿卡那花色（V0.2）
export type Arcana = 'major' | 'minor'
export type Suit = 'wands' | 'cups' | 'swords' | 'pentacles'

// 单张塔罗牌的静态数据
export type TarotCard = {
  id: string
  number: string // 罗马数字编号，如 "0" / "I" / "XXI"；小阿卡那留空字符串
  nameEn: string
  nameZh: string
  arcana: Arcana // 大阿卡那 / 小阿卡那（V0.2）
  suit?: Suit // 仅小阿卡那有花色（V0.2）
  rank?: string // 小阿卡那点数/宫廷牌，如 "ace" / "two" / "king"（V0.2）
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
