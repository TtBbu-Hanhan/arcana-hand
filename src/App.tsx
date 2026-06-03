import { useArcanaStore } from './store/tarotStore'
import { Starfield } from './components/Starfield'
import { LandingPage } from './pages/LandingPage'
import { QuestionPage } from './pages/QuestionPage'
import { ModeSelectPage } from './pages/ModeSelectPage'
import { CalibrationPage } from './pages/CalibrationPage'
import { ShufflePage } from './pages/ShufflePage'
import { DrawPage } from './pages/DrawPage'
import { RevealPage } from './pages/RevealPage'
import { ResultPage } from './pages/ResultPage'

// 状态机路由（文档 §13.3）
export function App() {
  const phase = useArcanaStore((s) => s.phase)

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
    case 'RESULT':
      page = <ResultPage />
      break
    default:
      page = <LandingPage />
  }

  return (
    <div className="relative h-full w-full overflow-hidden">
      <Starfield />
      <div className="relative z-10 h-full w-full">{page}</div>
    </div>
  )
}
