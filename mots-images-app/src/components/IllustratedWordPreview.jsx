import { useMemo } from 'react'
import WordStage from './WordStage'
import { computeWordBounds } from '../wordGeometry'

const BASE_FONT_SIZE = 70
const MIN_FONT_SIZE = 14
const PREVIEW_MARGIN = 8
// Sized for the tightest real context this component renders in (the card
// grids in the word bank and series detail — see .illustrated-preview-frame
// in index.css), not measured from the actual container. A fixed, known
// target computed synchronously (no DOM measurement, no ResizeObserver,
// nothing that can race against Konva's own render) guarantees the word
// never overflows its frame, on any screen — the trade-off is that a
// preview in a taller frame (e.g. the test screen's hint) won't use all of
// its extra headroom, which is the safe direction to be wrong in.
const TARGET_WIDTH = 190
const TARGET_HEIGHT = 150

export default function IllustratedWordPreview({ text, zones = [], theme = 'light', fontFamily = 'OpenDyslexic' }) {
  const letterColors = useMemo(() => {
    const map = {}
    zones.forEach((z) => {
      if (z.letterColor) map[z.letterIndex] = z.letterColor
    })
    return map
  }, [zones])

  // WordStage's own geometry (letters plus any zone illustration bounds)
  // scales linearly with fontSize, so the fontSize that makes it fit a
  // target box can be solved for directly — measured once at BASE_FONT_SIZE
  // and scaled down algebraically — rather than rendering first and trying
  // to shrink the result after the fact.
  const fontSize = useMemo(() => {
    const natural = computeWordBounds(text, zones, fontFamily, BASE_FONT_SIZE)
    const availableWidth = TARGET_WIDTH - PREVIEW_MARGIN * 2
    const availableHeight = TARGET_HEIGHT - PREVIEW_MARGIN * 2
    if (natural.width <= 0 || natural.height <= 0) return BASE_FONT_SIZE
    const fitWidth = (availableWidth * BASE_FONT_SIZE) / natural.width
    const fitHeight = (availableHeight * BASE_FONT_SIZE) / natural.height
    return Math.max(MIN_FONT_SIZE, Math.min(fitWidth, fitHeight, BASE_FONT_SIZE))
  }, [text, zones, fontFamily])

  return (
    <div className="illustrated-preview-frame">
      <WordStage
        text={text}
        fontFamily={fontFamily}
        fontSize={fontSize}
        zones={zones}
        letterColors={letterColors}
        theme={theme}
        interactive={false}
        margin={PREVIEW_MARGIN}
      />
    </div>
  )
}
