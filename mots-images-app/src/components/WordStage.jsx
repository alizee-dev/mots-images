import React, { useEffect, useMemo, useState, forwardRef } from 'react'
import { Stage, Layer, Text, Rect, Line, Group, Image as KonvaImage } from 'react-konva'
import {
  measureWord,
  getZoneFrame,
  computeZoneRect,
  LETTER_BOX_RATIO,
  getClipProps,
  measureGlyphBox,
} from '../wordGeometry'

const THEME = {
  light: { background: '#ffffff', letter: '#22303f' },
  dark: { background: '#181c24', letter: '#f5f7fa' },
}

function useHtmlImage(src) {
  const [img, setImg] = useState(null)
  useEffect(() => {
    if (!src) {
      setImg(null)
      return
    }
    const image = new window.Image()
    image.onload = () => setImg(image)
    image.src = src
    return () => {
      image.onload = null
    }
  }, [src])
  return img
}

function StickerImage({ image, x, y, size, rotation }) {
  const img = useHtmlImage(image.dataUrl)
  if (!img) return null
  const height = size * (image.aspect || 1)
  const clipProps = getClipProps(image, size, height)
  return (
    <Group x={x} y={y} rotation={rotation || 0} opacity={image.opacity ?? 1} listening={false} {...clipProps}>
      <KonvaImage image={img} width={size} height={height} offsetX={size / 2} offsetY={height / 2} />
    </Group>
  )
}

function ZoneIllustration({ zone, frame }) {
  const illu = zone.illustration
  return (
    <Group listening={false}>
      {illu.strokes.map((s) => (
        <Line
          key={s.id}
          points={s.points.map((v, i) => (i % 2 === 0 ? frame.x + v * frame.size : frame.y + v * frame.size))}
          stroke={s.color}
          strokeWidth={s.strokeWidth * frame.size}
          opacity={s.opacity ?? 1}
          lineCap="round"
          lineJoin="round"
          tension={0.35}
        />
      ))}
      {illu.stickers.map((s) => {
        const size = s.sizeFrac * frame.size
        const box = measureGlyphBox(s.emoji, size)
        const clipProps = getClipProps(s, box.width, box.height)
        return (
          <Group
            key={s.id}
            x={frame.x + s.xFrac * frame.size}
            y={frame.y + s.yFrac * frame.size}
            rotation={s.rotation || 0}
            opacity={s.opacity ?? 1}
            {...clipProps}
          >
            <Text text={s.emoji} fontSize={size} offsetX={box.width / 2} offsetY={box.height / 2} />
          </Group>
        )
      })}
      {illu.images.map((im) => (
        <StickerImage
          key={im.id}
          image={im}
          x={frame.x + im.xFrac * frame.size}
          y={frame.y + im.yFrac * frame.size}
          size={im.widthFrac * frame.size}
          rotation={im.rotation || 0}
        />
      ))}
    </Group>
  )
}

const WordStage = forwardRef(function WordStage(
  {
    text,
    fontFamily,
    fontSize = 130,
    zones,
    letterColors = {},
    theme = 'light',
    showIllustrations = true,
    interactive = false,
    onSelectLetter,
    margin = 40,
  },
  ref
) {
  const { letters, totalWidth } = useMemo(
    () => measureWord(text, fontFamily, fontSize),
    [text, fontFamily, fontSize]
  )
  const boxHeight = fontSize * LETTER_BOX_RATIO
  const wordWidth = Math.max(totalWidth, fontSize)
  const palette = THEME[theme] || THEME.light

  // The visible canvas must be large enough to contain every zone's
  // illustration frame, not just the letters row — otherwise anything an
  // illustration draws above/below/beside the letters gets clipped by the
  // canvas edge.
  const bounds = useMemo(() => {
    let minX = 0
    let maxX = wordWidth
    let minY = 0
    let maxY = boxHeight
    zones.forEach((zone) => {
      const rect = computeZoneRect(zone, letters, fontSize)
      if (!rect) return
      const frame = getZoneFrame(rect)
      minX = Math.min(minX, frame.x)
      maxX = Math.max(maxX, frame.x + frame.size)
      minY = Math.min(minY, frame.y)
      maxY = Math.max(maxY, frame.y + frame.size)
    })
    return { minX, maxX, minY, maxY }
  }, [zones, letters, fontSize, wordWidth, boxHeight])

  const offsetX = margin - bounds.minX
  const offsetY = margin - bounds.minY
  const stageWidth = bounds.maxX - bounds.minX + margin * 2
  const stageHeight = bounds.maxY - bounds.minY + margin * 2

  return (
    <div className="word-stage-wrap">
      <Stage ref={ref} width={stageWidth} height={stageHeight}>
        <Layer x={offsetX} y={offsetY}>
          <Rect x={-offsetX} y={-offsetY} width={stageWidth} height={stageHeight} fill={palette.background} listening={false} />

          {letters.map((letter, i) => {
            const zone = zones.find((z) => z.letterIndex === i)
            return (
              <Group key={i}>
                <Rect
                  x={letter.x}
                  y={0}
                  width={letter.width}
                  height={boxHeight}
                  fill={interactive && zone ? '#fff3cf' : 'transparent'}
                  stroke={interactive ? '#dbe1e8' : 'transparent'}
                  strokeWidth={2}
                  cornerRadius={12}
                  onClick={() => interactive && onSelectLetter && onSelectLetter(i)}
                  onTap={() => interactive && onSelectLetter && onSelectLetter(i)}
                  listening={interactive}
                />
                <Text
                  text={letter.char}
                  x={letter.x}
                  y={0}
                  width={letter.width}
                  height={boxHeight}
                  fontSize={fontSize}
                  fontFamily={fontFamily}
                  fontStyle="700"
                  fill={letterColors[i] || palette.letter}
                  align="center"
                  verticalAlign="middle"
                  listening={false}
                />
              </Group>
            )
          })}

          {showIllustrations &&
            zones.map((zone) => {
              const rect = computeZoneRect(zone, letters, fontSize)
              if (!rect) return null
              const frame = getZoneFrame(rect)
              return <ZoneIllustration key={zone.id} zone={zone} frame={frame} />
            })}
        </Layer>
      </Stage>
    </div>
  )
})

export default WordStage
