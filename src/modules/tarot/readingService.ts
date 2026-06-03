import type { DrawnCard, ReadingResult, TarotCard, SpreadPosition } from '../../types/tarot'
import { TAROT_DECK } from '../../data/tarotDeck'

export function getCard(cardId: string): TarotCard | undefined {
  return TAROT_DECK.find((c) => c.id === cardId)
}

const POSITION_LABEL: Record<SpreadPosition, string> = {
  situation: '现状',
  obstacle: '阻碍',
  advice: '建议',
}

export function positionLabel(pos: SpreadPosition): string {
  return POSITION_LABEL[pos]
}

export function orientationLabel(o: 'upright' | 'reversed'): string {
  return o === 'upright' ? '正位' : '逆位'
}

// 取某张抽出牌在其卡位下的解读文本
export function cardMeaning(drawn: DrawnCard): string {
  const card = getCard(drawn.cardId)
  if (!card) return ''
  return card[drawn.orientation].meaning
}

export function cardAdvice(drawn: DrawnCard): string {
  const card = getCard(drawn.cardId)
  if (!card) return ''
  return card[drawn.orientation].advice
}

// 综合建议：将三张牌的能量串成一段闭环解读（本地模拟，后续可替换为 AI API）
export function buildReading(question: string, drawn: DrawnCard[]): ReadingResult {
  const byPos = (pos: SpreadPosition) => drawn.find((d) => d.position === pos)
  const situation = byPos('situation')
  const obstacle = byPos('obstacle')
  const advice = byPos('advice')

  const situationCard = situation ? getCard(situation.cardId) : undefined
  const obstacleCard = obstacle ? getCard(obstacle.cardId) : undefined
  const adviceCard = advice ? getCard(advice.cardId) : undefined

  // 综合概述
  const parts: string[] = []
  if (situationCard && situation) {
    parts.push(
      `此刻的处境由「${situationCard.nameZh}·${orientationLabel(situation.orientation)}」标示，` +
        `${situationCard[situation.orientation].meaning}`,
    )
  }
  if (obstacleCard && obstacle) {
    parts.push(
      `真正的阻碍来自「${obstacleCard.nameZh}·${orientationLabel(obstacle.orientation)}」——` +
        `${obstacleCard[obstacle.orientation].meaning}`,
    )
  }
  if (adviceCard && advice) {
    parts.push(
      `而牌阵给出的方向是「${adviceCard.nameZh}·${orientationLabel(advice.orientation)}」，` +
        `${adviceCard[advice.orientation].meaning}`,
    )
  }
  const summary = parts.join('\n')

  // 最终行动建议
  const finalParts: string[] = []
  if (adviceCard && advice) finalParts.push(adviceCard[advice.orientation].advice)
  if (obstacleCard && obstacle) finalParts.push(obstacleCard[obstacle.orientation].advice)
  const finalAdvice =
    finalParts.length > 0
      ? finalParts.join(' ') + ' 让这三张牌的提醒陪你走出下一步。'
      : '相信你此刻的直觉，迈出属于你的下一步。'

  return {
    question: question.trim() ? question.trim() : '',
    spread: 'situation_obstacle_advice',
    cards: drawn,
    summary,
    finalAdvice,
  }
}
