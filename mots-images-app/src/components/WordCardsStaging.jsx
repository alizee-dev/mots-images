import IllustratedWordPreview from './IllustratedWordPreview'
import { PRINT_LAYOUTS } from '../printLayouts'

// The source resolution each card is rendered at before export — higher
// for layouts that blow the card up bigger on the printed page, so it
// doesn't look soft. The word's own aspect ratio is preserved regardless
// (these are just a bounding box), so a bigger box here is purely about
// print sharpness, not shape.
const CARD_SIZE = {
  full: { targetWidth: 900, targetHeight: 700 },
  two: { targetWidth: 420, targetHeight: 340 },
  // Same rendering size originally used for 4-per-page — unchanged even
  // though the page now fits 6, spread out more evenly.
  grid6: { targetWidth: 340, targetHeight: 280 },
}

// Mounted off-screen (see .bank-print-stage in index.css) purely so Konva
// actually paints each selected word's canvas — WordsBankPage then reads
// those canvases through stageRefs and exports them as flat images for a
// separate print window, rather than trying to print this DOM directly
// (which is what kept leaving pages blank or invisible before).
export default function WordCardsStaging({ words, layout, stageRefs }) {
  const config = PRINT_LAYOUTS.find((l) => l.id === layout) || PRINT_LAYOUTS[0]
  const size = CARD_SIZE[config.id]

  return (
    <div className="bank-print-stage">
      {words.map((word) => (
        <IllustratedWordPreview
          key={word.id}
          ref={(node) => {
            stageRefs.current[word.id] = node
          }}
          text={word.text}
          zones={word.zones}
          {...size}
        />
      ))}
    </div>
  )
}
