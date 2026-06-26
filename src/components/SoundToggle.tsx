import { useState, useCallback } from 'react'
import { audioManager } from '../utils/audioManager'

// 右上角静音切换按钮 — 仅在首次交互（音频解锁）后显示
export function SoundToggle() {
  const [muted, setMuted] = useState(!audioManager.soundEnabled)

  const handleClick = useCallback(() => {
    audioManager.toggleMute()
    setMuted(!audioManager.soundEnabled)
  }, [])

  // 未解锁时不渲染（首页尚未点击"开始占卜"）
  if (!audioManager.isUnlocked) return null

  return (
    <button
      onClick={handleClick}
      className="fixed right-5 top-5 z-50 flex h-9 w-9 items-center justify-center rounded-full border border-gold/30 bg-bg-purple/80 text-lg text-gold transition-arcana hover:border-gold/60 hover:bg-bg-purple/95"
      style={{ backdropFilter: 'blur(4px)', boxShadow: '0 0 12px rgba(214,181,109,0.3)' }}
      title={muted ? '开启声音' : '静音'}
      aria-label={muted ? '开启声音' : '静音'}
    >
      {muted ? '🔇' : '🔊'}
    </button>
  )
}
