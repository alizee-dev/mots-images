import { useEffect, useMemo, useRef, useState } from 'react'
import WordStage from './WordStage'

const BASE_FONT_SIZE = 70

export default function IllustratedWordPreview({ text, zones = [], theme = 'light', fontFamily = 'system-ui' }) {
  const letterColors = useMemo(() => {
    const map = {}
    zones.forEach((z) => {
      if (z.letterColor) map[z.letterIndex] = z.letterColor
    })
    return map
  }, [zones])

  const frameRef = useRef(null)
  const contentRef = useRef(null)
  const [scale, setScale] = useState(1)

  // WordStage sizes its canvas from the word's own geometry (letters, plus
  // any illustration bounds — a zone can extend well above/below/beside the
  // letter row), not from its container. Everything on that canvas scales
  // proportionally with fontSize, so measuring the canvas actually rendered
  // at BASE_FONT_SIZE and scaling the whole thing down to fit this frame is
  // equivalent to picking a smaller fontSize per word — it just doesn't
  // require re-deriving WordStage's own layout math here to do it, and it
  // naturally accounts for illustrations, not just letter width.
  useEffect(() => {
    const frame = frameRef.current
    const content = contentRef.current
    if (!frame || !content) return

    function update() {
      const canvas = content.querySelector('canvas')
      if (!canvas || !canvas.offsetWidth || !canvas.offsetHeight) return
      const fit = Math.min(frame.clientWidth / canvas.offsetWidth, frame.clientHeight / canvas.offsetHeight, 1)
      setScale(fit)
    }

    update()
    const ro = new ResizeObserver(update)
    ro.observe(frame)
    ro.observe(content)
    return () => ro.disconnect()
  }, [text, zones, fontFamily])

  return (
    <div className="illustrated-preview-frame" ref={frameRef}>
      <div ref={contentRef} style={{ transform: `scale(${scale})` }}>
        <WordStage
          text={text}
          fontFamily={fontFamily}
          fontSize={BASE_FONT_SIZE}
          zones={zones}
          letterColors={letterColors}
          theme={theme}
          interactive={false}
        />
      </div>
    </div>
  )
}
