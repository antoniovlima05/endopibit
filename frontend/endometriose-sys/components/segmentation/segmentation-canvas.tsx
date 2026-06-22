"use client"

import React, { useEffect, useMemo, useRef, useState } from "react"
import {
  Stage,
  Layer,
  Line,
  Image as KonvaImage,
  Circle,
} from "react-konva"
import useImage from "use-image"
import type { Mask } from "./types/Mask"
import type { MarkingClasses } from "./types/MarkingClasses"
import classToColor from "./types/MarkingColors"
import type { ManualCorrectionType } from "@/app/page"

interface SegmentationCanvasProps {
  imageUrl: string
  maskUrl?: string | null
  correctionType: ManualCorrectionType
  labelOfMarkClass: MarkingClasses
  markTool: "brush" | "eraser" | "polygon"
  strokeSize: number
  markArray: Mask[]
  setMask: React.Dispatch<React.SetStateAction<Mask[]>>
}

const MAX_CANVAS_WIDTH = 620
const MAX_CANVAS_HEIGHT = 620
const MAX_POLYGON_POINTS = 8

type Point = {
  x: number
  y: number
}

export default function SegmentationCanvas({
  imageUrl,
  maskUrl,
  correctionType,
  labelOfMarkClass,
  markTool,
  strokeSize,
  markArray,
  setMask,
}: SegmentationCanvasProps) {
  const [image] = useImage(imageUrl, "anonymous")
  const [cursor, setCursor] = useState({ x: 0, y: 0 })
  const [canvasSize, setCanvasSize] = useState({
    width: 512,
    height: 512,
  })
  const [activePointIndex, setActivePointIndex] = useState<number | null>(null)
  const [referencePolygonPoints, setReferencePolygonPoints] = useState<number[]>([])

  const isDrawing = useRef(false)
  const isPolygonMode =
    correctionType === "partial-adjustment" && markTool === "polygon"

  useEffect(() => {
    if (!image) return

    const naturalWidth = image.width || 512
    const naturalHeight = image.height || 512

    const scale = Math.min(
      MAX_CANVAS_WIDTH / naturalWidth,
      MAX_CANVAS_HEIGHT / naturalHeight,
      1
    )

    setCanvasSize({
      width: Math.round(naturalWidth * scale),
      height: Math.round(naturalHeight * scale),
    })
  }, [image])

  const imageMeta = useMemo(
    () => ({
      displayWidth: canvasSize.width,
      displayHeight: canvasSize.height,
      originalWidth: image?.width ?? canvasSize.width,
      originalHeight: image?.height ?? canvasSize.height,
    }),
    [canvasSize.width, canvasSize.height, image]
  )

  const getPointerPosition = (e: any) => {
    const stage = e.target.getStage()
    const point = stage?.getPointerPosition()

    if (!point) return null

    return {
      x: point.x,
      y: point.y,
    }
  }

  const createOrUpdatePolygonMask = (points: number[]) => {
    setMask((prev) => {
      const currentMask = prev.find((m) => m.label === labelOfMarkClass)

      const polygonLine = {
        tool: "polygon" as const,
        points,
        markStroke: 2,
        markSubtype: "boundary",
      }

      if (currentMask) {
        return prev.map((mask) =>
          mask.label === labelOfMarkClass
            ? {
                ...mask,
                data: [polygonLine],
                width: imageMeta.displayWidth,
                height: imageMeta.displayHeight,
                meta: JSON.stringify(imageMeta),
              }
            : mask
        )
      }

      return [
        ...prev,
        {
          id: crypto.randomUUID(),
          label: labelOfMarkClass,
          meta: JSON.stringify(imageMeta),
          data: [polygonLine],
          width: imageMeta.displayWidth,
          height: imageMeta.displayHeight,
          enable: true,
          selected: true,
          visible: true,
          username: "medical-specialist",
        },
      ]
    })
  }

  const getPolygonPoints = () => {
    const polygonMask = markArray.find((m) => m.label === labelOfMarkClass)
    const polygon = polygonMask?.data.find((item) => item.tool === "polygon")
    return polygon?.points ?? []
  }

  const updatePolygonPoint = (pointIndex: number, point: Point) => {
    const currentPoints = getPolygonPoints()

    if (currentPoints.length === 0) return

    const updatedPoints = [...currentPoints]
    updatedPoints[pointIndex * 2] = point.x
    updatedPoints[pointIndex * 2 + 1] = point.y

    createOrUpdatePolygonMask(updatedPoints)
  }

  const handleMouseDown = (e: any) => {
    const point = getPointerPosition(e)

    if (!point) return

    if (isPolygonMode) {
      return
    }

    isDrawing.current = true

    setMask((prev) => {
      const currentMask = prev.find((m) => m.label === labelOfMarkClass)

      const newLine = {
        tool: markTool,
        points: [point.x, point.y],
        markStroke: strokeSize,
        markSubtype: null,
      }

      if (currentMask) {
        return prev.map((mask) =>
          mask.label === labelOfMarkClass
            ? {
                ...mask,
                data: [...mask.data, newLine],
                width: imageMeta.displayWidth,
                height: imageMeta.displayHeight,
                meta: JSON.stringify(imageMeta),
              }
            : mask
        )
      }

      return [
        ...prev,
        {
          id: crypto.randomUUID(),
          label: labelOfMarkClass,
          meta: JSON.stringify(imageMeta),
          data: [newLine],
          width: imageMeta.displayWidth,
          height: imageMeta.displayHeight,
          enable: true,
          selected: true,
          visible: true,
          username: "medical-specialist",
        },
      ]
    })
  }

  const handleMouseMove = (e: any) => {
    const point = getPointerPosition(e)

    if (!point) return

    setCursor(point)

    if (isPolygonMode) return
    if (!isDrawing.current) return

    setMask((prev) =>
      prev.map((mask) => {
        if (mask.label !== labelOfMarkClass) return mask

        const updatedData = [...mask.data]
        const lastLine = updatedData[updatedData.length - 1]

        if (!lastLine) return mask

        updatedData[updatedData.length - 1] = {
          ...lastLine,
          points: [...lastLine.points, point.x, point.y],
        }

        return {
          ...mask,
          data: updatedData,
          width: imageMeta.displayWidth,
          height: imageMeta.displayHeight,
          meta: JSON.stringify(imageMeta),
        }
      })
    )
  }

  const handleMouseUp = () => {
    isDrawing.current = false
    setActivePointIndex(null)
  }

  const extractPolygonFromMaskUrl = async () => {
    if (!maskUrl) return null

    const maskImage = new window.Image()
    maskImage.crossOrigin = "anonymous"
    maskImage.src = maskUrl

    await new Promise<void>((resolve, reject) => {
      maskImage.onload = () => resolve()
      maskImage.onerror = () => reject()
    })

    const canvas = document.createElement("canvas")
    canvas.width = maskImage.width
    canvas.height = maskImage.height

    const ctx = canvas.getContext("2d")
    if (!ctx) return null

    ctx.drawImage(maskImage, 0, 0)

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const data = imageData.data

    const boundaryPixels: Point[] = []

    const isForeground = (x: number, y: number) => {
      if (x < 0 || y < 0 || x >= canvas.width || y >= canvas.height) {
        return false
      }

      const idx = (y * canvas.width + x) * 4
      const r = data[idx]
      const g = data[idx + 1]
      const b = data[idx + 2]
      const a = data[idx + 3]

      return a > 0 && (r > 30 || g > 30 || b > 30)
    }

    for (let y = 1; y < canvas.height - 1; y++) {
      for (let x = 1; x < canvas.width - 1; x++) {
        if (!isForeground(x, y)) continue

        const isBoundary =
          !isForeground(x - 1, y) ||
          !isForeground(x + 1, y) ||
          !isForeground(x, y - 1) ||
          !isForeground(x, y + 1)

        if (isBoundary) {
          boundaryPixels.push({ x, y })
        }
      }
    }

    if (boundaryPixels.length === 0) return null

    const centroid = boundaryPixels.reduce(
      (acc, point) => ({
        x: acc.x + point.x / boundaryPixels.length,
        y: acc.y + point.y / boundaryPixels.length,
      }),
      { x: 0, y: 0 }
    )

    const sorted = boundaryPixels.sort((a, b) => {
      const angleA = Math.atan2(a.y - centroid.y, a.x - centroid.x)
      const angleB = Math.atan2(b.y - centroid.y, b.x - centroid.x)
      return angleA - angleB
    })

    const step = Math.max(1, Math.floor(sorted.length / MAX_POLYGON_POINTS))
    const sampled = sorted
      .filter((_, index) => index % step === 0)
      .slice(0, MAX_POLYGON_POINTS)

    const scaleX = canvasSize.width / canvas.width
    const scaleY = canvasSize.height / canvas.height

    return sampled.flatMap((point) => [point.x * scaleX, point.y * scaleY])
  }

  useEffect(() => {
    if (!isPolygonMode || !maskUrl || !image) return

    const alreadyHasPolygon = markArray.some((mask) =>
      mask.data.some((item) => item.tool === "polygon")
    )

    if (alreadyHasPolygon) return

    const loadMaskAsPolygon = async () => {
      const polygonPoints = await extractPolygonFromMaskUrl()

      if (!polygonPoints || polygonPoints.length === 0) return

      setReferencePolygonPoints(polygonPoints)
      createOrUpdatePolygonMask(polygonPoints)
    }

    loadMaskAsPolygon().catch(() => {
      console.warn("Não foi possível carregar a máscara para edição por pontos.")
    })
  }, [isPolygonMode, maskUrl, image, canvasSize.width, canvasSize.height])

  const polygonPoints = getPolygonPoints()

  return (
    <div className="rounded-xl overflow-hidden border bg-black shadow-2xl">
      <Stage
        width={canvasSize.width}
        height={canvasSize.height}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleMouseDown}
        onTouchMove={handleMouseMove}
        onTouchEnd={handleMouseUp}
      >
        <Layer>
          <KonvaImage
            image={image}
            x={0}
            y={0}
            width={canvasSize.width}
            height={canvasSize.height}
          />
        </Layer>

        <Layer>
          {isPolygonMode && referencePolygonPoints.length > 0 && (
            <Line
              points={referencePolygonPoints}
              stroke="#f59e0b"
              strokeWidth={2}
              tension={0.15}
              lineCap="round"
              lineJoin="round"
              closed
              fill="#f59e0b44"
              opacity={0.75}
              listening={false}
            />
          )}

          {markArray.map((mask) =>
            mask.data.map((line, index) => (
              <Line
                key={`${mask.id}-${index}`}
                points={line.points}
                stroke={classToColor[mask.label]}
                strokeWidth={line.tool === "polygon" ? 2.5 : line.markStroke}
                tension={line.tool === "polygon" ? 0.15 : 0.45}
                lineCap="round"
                lineJoin="round"
                closed={line.tool === "polygon"}
                fill={
                  line.tool === "polygon"
                    ? `${classToColor[mask.label]}88`
                    : undefined
                }
                visible={mask.visible}
                opacity={line.tool === "polygon" ? 0.72 : 0.85}
                globalCompositeOperation={
                  line.tool === "eraser" ? "destination-out" : "source-over"
                }
              />
            ))
          )}

          {isPolygonMode &&
            polygonPoints.map((_, index) => {
              if (index % 2 !== 0) return null

              const pointIndex = index / 2
              const isActive = activePointIndex === pointIndex

              return (
                <Circle
                  key={`polygon-point-${pointIndex}`}
                  x={polygonPoints[index]}
                  y={polygonPoints[index + 1]}
                  radius={isActive ? 9 : 7}
                  fill={isActive ? "#f59e0b" : "#0ea5e9"}
                  stroke="white"
                  strokeWidth={2}
                  shadowColor="black"
                  shadowBlur={4}
                  shadowOpacity={0.4}
                  draggable
                  onDragStart={() => setActivePointIndex(pointIndex)}
                  onDragMove={(e) =>
                    updatePolygonPoint(pointIndex, {
                      x: e.target.x(),
                      y: e.target.y(),
                    })
                  }
                  onDragEnd={() => setActivePointIndex(null)}
                />
              )
            })}

          {!isPolygonMode && (
            <Circle
              x={cursor.x}
              y={cursor.y}
              radius={strokeSize / 2}
              stroke="white"
              strokeWidth={1}
              opacity={0.8}
            />
          )}
        </Layer>
      </Stage>
    </div>
  )
}