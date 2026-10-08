// 画像リサイズ＆レインボーバーン演出ユーティリティ プリン事業 AIドリブン経営プロダクト同等仕様 

/**
 * 端末の写真・ファイルをCanvasで正方形 256x256 に中央トリミング＆リサイズしてBase64を返す
 */
export const processAndResizeImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('画像ファイルを選択してください'))
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas')
          const size = 256
          canvas.width = size
          canvas.height = size
          const ctx = canvas.getContext('2d')
          if (!ctx) {
            resolve(e.target?.result as string)
            return
          }

          // 正方形中央クロップ
          const minSide = Math.min(img.width, img.height)
          const sx = (img.width - minSide) / 2
          const sy = (img.height - minSide) / 2
          ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size)
          resolve(canvas.toDataURL('image/jpeg', 0.88))
        } catch {
          resolve(e.target?.result as string)
        }
      }
      img.onerror = reject
      img.src = e.target?.result as string
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/**
 * バーン！ピキーン！という爽快な祝賀インパクト効果音 Web Audio API 
 * 外部音源ファイル不要で100%確実にブラウザ上で再生可能
 */
export const playBurnImpactSound = () => {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!AudioContextClass) return
    const ctx = new AudioContextClass()

    // 1. ピキーン！という高周波のキラキラ立ち上がり音 クリスタルベル風 
    const oscChime = ctx.createOscillator()
    const gainChime = ctx.createGain()
    oscChime.type = 'sine'
    oscChime.frequency.setValueAtTime(587.33, ctx.currentTime) // D5
    oscChime.frequency.exponentialRampToValueAtTime(1760.0, ctx.currentTime + 0.12) // A6
    gainChime.gain.setValueAtTime(0.25, ctx.currentTime)
    gainChime.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35)
    oscChime.connect(gainChime)
    gainChime.connect(ctx.destination)
    oscChime.start()
    oscChime.stop(ctx.currentTime + 0.35)

    // 2. バーン！！という迫力の重低音インパクト＆アタック
    const oscBoom = ctx.createOscillator()
    const gainBoom = ctx.createGain()
    oscBoom.type = 'triangle'
    oscBoom.frequency.setValueAtTime(260, ctx.currentTime + 0.05)
    oscBoom.frequency.exponentialRampToValueAtTime(45, ctx.currentTime + 0.45)
    gainBoom.gain.setValueAtTime(0.7, ctx.currentTime + 0.05)
    gainBoom.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5)
    oscBoom.connect(gainBoom)
    gainBoom.connect(ctx.destination)
    oscBoom.start(ctx.currentTime + 0.05)
    oscBoom.stop(ctx.currentTime + 0.5)
  } catch (err) {
    console.debug('Audio playback note:', err)
  }
}

/**
 * 虹色発光＆バーン着地演出用 CSS Keyframes
 */
export const RAINBOW_BURN_CSS = `
  @keyframes rainbowGlowSpin {
    0% {
      transform: rotate(0deg);
      filter: hue-rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
      filter: hue-rotate(360deg);
    }
  }

  @keyframes avatarBurnImpact {
    0% {
      transform: scale(0.25) rotate(-25deg);
      opacity: 0.2;
      filter: brightness(2.5) contrast(1.8);
      box-shadow: 0 0 50px #ff0055, 0 0 100px #00ffff;
    }
    35% {
      /* 手前に大きくグワッと飛び出す！ */
      transform: scale(2.4) rotate(12deg);
      opacity: 1;
      filter: brightness(1.8);
      box-shadow: 0 0 80px #ff00ff, 0 0 140px #ffff00;
    }
    60% {
      /* 一気に収縮して枠へ向かう */
      transform: scale(0.88) rotate(-4deg);
      filter: brightness(1.3);
      box-shadow: 0 0 45px #00ffcc;
    }
    80% {
      /* 枠への着地バウンス */
      transform: scale(1.15) rotate(2deg);
      filter: brightness(1.15);
    }
    100% {
      /* バーン！と枠にハマって着地完了 */
      transform: scale(1) rotate(0deg);
      filter: brightness(1);
      box-shadow: 0 2px 10px rgba(0,0,0,0.18);
    }
  }

  @keyframes rainbowShockwave {
    0% {
      transform: scale(0.6);
      opacity: 1;
      border-color: #ff007f;
      box-shadow: 0 0 20px #ff007f, inset 0 0 15px #00f0ff;
    }
    50% {
      border-color: #00ffcc;
      box-shadow: 0 0 35px #00ffea, 0 0 60px #ff00ff;
    }
    100% {
      transform: scale(3.2);
      opacity: 0;
      border-color: #7928ca;
      box-shadow: 0 0 40px #7928ca;
    }
  }

  @keyframes rainbowSparkleBurst {
    0% {
      transform: scale(0) rotate(0deg);
      opacity: 1;
    }
    50% {
      opacity: 1;
      transform: scale(1.6) rotate(90deg);
    }
    100% {
      transform: scale(2.2) rotate(180deg);
      opacity: 0;
    }
  }
`
