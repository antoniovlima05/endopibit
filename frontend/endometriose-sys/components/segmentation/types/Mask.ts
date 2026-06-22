import type { MarkingClasses } from "./MarkingClasses"

export interface Mask {
  label: MarkingClasses
  id: string
  meta: string
  data: MarkingFormat[]
  width: number
  height: number
  enable: boolean
  selected: boolean
  visible: boolean
  username: string
}

export type MarkingFormat = {
  markSubtype: string | null
  tool: "brush" | "eraser" | "polygon"
  points: number[]
  markStroke: number
}