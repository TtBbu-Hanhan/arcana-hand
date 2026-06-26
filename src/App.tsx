import { useEffect } from 'react'
import { useArcanaStore } from './store/tarotStore'
import { Starfield } from './components/Starfield'
import { LandingPage } from './pages/LandingPage'
import { QuestionPage } from './pages/QuestionPage'
import { ModeSelectPage } from './pages/ModeSelectPage'
import { CalibrationPage } from './pages/CalibrationPage'
import { ShufflePage } from './pages/ShufflePage'
import { CutDeckPage } from './pages/CutDeckPage'
import { DrawPage } from './pages/DrawPage'
import { RevealPage } from './pages/RevealPage'
import { CardReadingsPage } from './pages/CardReadingsPage'
import { AiSummaryPage } from './pages/AiSummaryPage'
import { ResultPage } from './pages/ResultPage'
import { SoundToggle } from './components/SoundToggle'
import { audioManager } from './utils/audioManager'

// 状态机路由（文档 §13.3）
export function App() {
  const phase = useArcanaStore((s) => s.phase)

  // BGM 生命周期：回到首页（INIT）时停止 BGM
  useEffect(() => {
    if (phase === 'INIT') {
      audioManager.stopBGM()
    }
  }, [phase])

  let page
  switch (phase) {
    case 'INIT':
      page = <LandingPage />
      break
    case 'QUESTION_INPUT':
      page = <QuestionPage />
      break
    case 'MODE_SELECT':
      page = <ModeSelectPage />
      break
    case 'CALIBRATION':
      page = <CalibrationPage />
      break
    case 'SHUFFLING':
      page = <ShufflePage />
      break
    case 'CUT_DECK':
    case 'CHOOSE_PILE':
    case 'SPREAD_SELECTED_PILE':
      page = <CutDeckPage />
      break
    case 'DRAW_CARD_1':
    case 'DRAW_CARD_2':
    case 'DRAW_CARD_3':
      page = <DrawPage />
      break
    case 'RITUAL_PAUSE':
    case 'REVEALING':
      page = <RevealPage />
      break
    case 'READING':
      // AI 生成中：沿用翻牌页的过渡视觉，避免空屏
      page = <RevealPage />
      break
    case 'CARD_READINGS':
      page = <CardReadingsPage />
      break
    case 'AI_SUMMARY':
      page = <AiSummaryPage />
      break
    case 'RESULT':
      page = <ResultPage />
      break
    default:
      page = <LandingPage />
  }

  return (
    <div className="relative h-full w-full overflow-hidden">
      <Starfield />
      <SoundToggle />
      <div className="relative z-10 h-full w-full">{page}</div>
    </div>
  )
}
