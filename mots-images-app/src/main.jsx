import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/opendyslexic/400.css'
import '@fontsource/opendyslexic/700.css'
import './index.css'
import App from './App.jsx'

const root = createRoot(document.getElementById('root'))

function render() {
  root.render(
    <StrictMode>
      <App />
    </StrictMode>
  )
}

// Canvas text (every illustrated word, via Konva) doesn't redraw itself when
// a web font finishes loading the way DOM text does. If the app's first
// render happens before OpenDyslexic is ready, the letter boxes get measured
// against one font's metrics while the glyphs drawn inside them end up using
// another — a visible mismatch between the tiles and the letters. Waiting
// for every requested font to be ready before the very first render removes
// that race app-wide, at the cost of a small one-time delay on cold load.
if (document.fonts && document.fonts.ready) {
  document.fonts.ready.then(render).catch(render)
} else {
  render()
}
