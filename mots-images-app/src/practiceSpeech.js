// Wraps the browser's built-in speech synthesis (Web Speech API, no
// external service) to pronounce a word aloud — level 2 in particular
// relies on this as the *only* way a child learns which word to
// reconstruct, since the word is never shown as text there.
export function speakWord(text) {
  if (!text || typeof window === 'undefined' || !('speechSynthesis' in window)) return
  window.speechSynthesis.cancel() // never let two utterances overlap
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'fr-FR'
  utterance.rate = 0.85
  window.speechSynthesis.speak(utterance)
}

export function isSpeechSupported() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}
