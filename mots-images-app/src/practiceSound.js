import correctSoundSrc from './assets/sounds/son_reussite.mp3'
import incorrectSoundSrc from './assets/sounds/son_echec.mp3'

// A fresh Audio instance per play — reusing one and calling .play() again
// mid-playback (a child answering quickly, one after another) would just
// restart it instead of layering, and cloning is cheap for a 1-2s clip.
function play(src) {
  try {
    const audio = new window.Audio(src)
    // A missing/blocked file must never break the practice flow itself —
    // this is a nicety, not something the rest of the screen depends on.
    audio.play().catch(() => {})
  } catch {
    // ignore
  }
}

export function playCorrectSound() {
  play(correctSoundSrc)
}

export function playIncorrectSound() {
  play(incorrectSoundSrc)
}
