// 轻量级音效管理器 — 塔罗占卜仪式音效
// 浏览器要求用户先交互后才能播放音频，所有音效文件缺失时不会报错

type SoundName = 'shuffle-paper' | 'card-pick' | 'card-place' | 'card-flip'

const VOLUME: Record<SoundName, number> = {
  'shuffle-paper': 0.35,
  'card-pick': 0.45,
  'card-place': 0.35,
  'card-flip': 0.45,
}

const BGM_VOLUME = 0.18
const SHUFFLE_THROTTLE_MS = 300

class AudioManager {
  private clips: Record<SoundName, HTMLAudioElement[]> = {
    'shuffle-paper': [],
    'card-pick': [],
    'card-place': [],
    'card-flip': [],
  }
  private bgm: HTMLAudioElement | null = null
  private unlocked = false
  private shuffleLastAt = 0
  soundEnabled = true

  // 在用户首次交互（点击「开始占卜」等）时调用，解锁音频自动播放
  unlock(): void {
    if (this.unlocked) return
    this.unlocked = true
    // 预创建每个音效的 Audio 实例（带容错）
    for (const name of Object.keys(VOLUME) as SoundName[]) {
      try {
        const a = new Audio(`${import.meta.env.BASE_URL}sounds/${name}.mp3`)
        a.volume = VOLUME[name]
        a.preload = 'auto'
        this.clips[name].push(a)
      } catch {
        // 文件不存在或浏览器不支持，静默跳过
      }
    }
    // 初始化 BGM
    try {
      this.bgm = new Audio(`${import.meta.env.BASE_URL}sounds/bgm.mp3`)
      this.bgm.volume = BGM_VOLUME
      this.bgm.loop = true
      this.bgm.preload = 'auto'
    } catch {
      this.bgm = null
    }
  }

  play(name: SoundName): void {
    if (!this.soundEnabled || !this.unlocked) return
    if (name === 'shuffle-paper') {
      const now = performance.now()
      if (now - this.shuffleLastAt < SHUFFLE_THROTTLE_MS) return
      this.shuffleLastAt = now
    }
    const clips = this.clips[name]
    if (clips.length === 0) return
    // 复用第一个 clip，快速 seek 回 0 实现快速连播
    const a = clips[0]
    try {
      a.currentTime = 0
      const p = a.play()
      if (p && typeof p.catch === 'function') {
        p.catch(() => {
          // 忽略播放失败（浏览器限制、文件缺失等）
        })
      }
    } catch {
      // 静默容错
    }
  }

  playBGM(): void {
    if (!this.unlocked || !this.bgm) return
    try {
      const p = this.bgm.play()
      if (p && typeof p.catch === 'function') {
        p.catch(() => {
          // 忽略播放失败
        })
      }
    } catch {
      // 静默容错
    }
  }

  stopBGM(): void {
    if (!this.bgm) return
    try {
      this.bgm.pause()
      this.bgm.currentTime = 0
    } catch {
      // 静默容错
    }
  }

  toggleMute(): void {
    this.soundEnabled = !this.soundEnabled
    if (this.bgm) {
      this.bgm.muted = !this.soundEnabled
    }
  }

  get isPlayingBGM(): boolean {
    return this.bgm !== null && !this.bgm.paused
  }

  get isUnlocked(): boolean {
    return this.unlocked
  }
}

// 全局单例
export const audioManager = new AudioManager()
