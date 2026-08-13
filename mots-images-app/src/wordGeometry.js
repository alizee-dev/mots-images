const measureCanvas = typeof document !== 'undefined' ? document.createElement('canvas') : null
const measureCtx = measureCanvas ? measureCanvas.getContext('2d') : null

export const LETTER_GAP_RATIO = 0.12
export const LETTER_BOX_RATIO = 1.35
export const ZONE_FRAME_ZOOM = 3

// Lays out a word letter by letter. Coordinates scale linearly with fontSize,
// so geometry captured at one fontSize can be re-expressed at any other size
// just by multiplying/dividing by fontSize.
export function measureWord(text, fontFamily, fontSize) {
  const chars = Array.from(text || '')
  const letters = []
  let cursorX = 0
  if (measureCtx) {
    measureCtx.font = `700 ${fontSize}px "${fontFamily}"`
  }
  for (const char of chars) {
    const display = char === ' ' ? ' ' : char
    const width = measureCtx
      ? measureCtx.measureText(display).width || fontSize * 0.6
      : fontSize * 0.6
    letters.push({ char, x: cursorX, width })
    cursorX += width + fontSize * LETTER_GAP_RATIO
  }
  const totalWidth = Math.max(cursorX - fontSize * LETTER_GAP_RATIO, 0)
  return { letters, totalWidth, fontSize }
}

// The square area around a zone's own rectangle where its illustration can
// spill over onto neighbouring letters (e.g. a fishing line reaching from one
// letter to the next). Illustration elements are stored as fractions of this
// frame, so it stays valid no matter which fontSize the word is rendered at.
export function getZoneFrame(rect, zoom = ZONE_FRAME_ZOOM) {
  const side = Math.max(rect.width, rect.height) * zoom
  const cx = rect.x + rect.width / 2
  const cy = rect.y + rect.height / 2
  return { x: cx - side / 2, y: cy - side / 2, size: side }
}

export function computeZoneRect(zone, letters, fontSize) {
  const letter = letters[zone.letterIndex]
  if (!letter) return null
  return { x: letter.x, y: 0, width: letter.width, height: fontSize * LETTER_BOX_RATIO }
}

// An emoji glyph's true rendered box rarely matches the fontSize it was
// requested at (metrics vary per-character and per-platform emoji font).
// Measuring it precisely — instead of assuming a fontSize×fontSize square —
// is what lets offset/centering and the crop clip agree on the same box.
// Deliberately does NOT go through Konva's own width/height/wrap layout:
// Konva's word-wrap splits by UTF-16 code unit, which corrupts astral-plane
// emoji (surrogate pairs), so this measures directly on a scratch canvas
// instead and only ever sets fontSize + offsetX/offsetY on the Text node.
export function measureGlyphBox(char, fontSize) {
  if (!measureCtx || !char) return { width: fontSize, height: fontSize }
  measureCtx.font = `${fontSize}px Arial`
  const m = measureCtx.measureText(char)
  const width = m.width || fontSize
  const ascent = m.actualBoundingBoxAscent || fontSize * 0.8
  const descent = m.actualBoundingBoxDescent || fontSize * 0.2
  const height = ascent + descent || fontSize
  return { width, height }
}

export const DEFAULT_CROP = { x: 0, y: 0, width: 1, height: 1 }

// Converts a crop expressed as fractions of an item's own bounding box into
// Konva clip coordinates, in the item's local (centered, unrotated) space.
export function cropToClip(crop, w, h) {
  const c = crop || DEFAULT_CROP
  return {
    x: -w / 2 + c.x * w,
    y: -h / 2 + c.y * h,
    width: Math.max(c.width * w, 1),
    height: Math.max(c.height * h, 1),
  }
}

// Returns Konva clip props (either an axis-aligned rect clip, or a freeform
// clipFunc for a lasso path) for an item, in its own local (centered,
// unrotated) space. A lasso path takes precedence over a rectangle crop when
// both are present, since drawing a lasso is what the user did most recently.
export function getClipProps(item, w, h) {
  if (item.cropPath && item.cropPath.length >= 3) {
    const path = item.cropPath
    return {
      clipFunc: (ctx) => {
        ctx.beginPath()
        path.forEach(([px, py], i) => {
          const x = -w / 2 + px * w
          const y = -h / 2 + py * h
          if (i === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        })
        ctx.closePath()
      },
    }
  }
  const clip = cropToClip(item.cropRect, w, h)
  return { clipX: clip.x, clipY: clip.y, clipWidth: clip.width, clipHeight: clip.height }
}
