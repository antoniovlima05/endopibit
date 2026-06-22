"use client"

import { useMemo, useState } from "react"
import type { ManualCorrectionType } from "@/app/page"
import {
  X,
  Save,
  Brush,
  Eraser,
  Trash2,
  Info,
  MousePointer2,
  Ban,
  RotateCcw,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import SegmentationCanvas from "./segmentation-canvas"
import type { Mask } from "./types/Mask"
import type { MarkingClasses } from "./types/MarkingClasses"
import classToColor from "./types/MarkingColors"

interface SegmentationToolModalProps {
  isOpen: boolean
  imageUrl: string
  maskUrl?: string | null
  correctionType: ManualCorrectionType
  hasInitialMask: boolean
  onClose: () => void
}

const classes: MarkingClasses[] = ["Endometriose"]

export default function SegmentationToolModal({
  isOpen,
  imageUrl,
  maskUrl,
  correctionType,
  hasInitialMask,
  onClose,
}: SegmentationToolModalProps) {
  const [selectedClass, setSelectedClass] =
    useState<MarkingClasses>("Endometriose")

  const [tool, setTool] = useState<"brush" | "eraser" | "polygon">(
    correctionType === "partial-adjustment" ? "polygon" : "brush"
  )

  const [strokeSize, setStrokeSize] = useState(8)
  const [masks, setMasks] = useState<Mask[]>([])
  const [saved, setSaved] = useState(false)
  const [useAiMask, setUseAiMask] = useState(
    correctionType === "partial-adjustment" && Boolean(maskUrl)
  )

  const isPartialAdjustment = correctionType === "partial-adjustment"
  const effectiveMaskUrl = useAiMask ? maskUrl : null

  const correctionInfo = useMemo(() => {
    switch (correctionType) {
      case "partial-adjustment":
        return {
          title: "Correção da Segmentação",
          description:
            "A IA gerou uma máscara inicial. Você pode ajustar a borda, complementar com pincel, apagar excessos ou ignorar a máscara da IA.",
          badge: "Correção assistida",
          modeText:
            "Use Editar borda para pequenos ajustes. Use Pincel para adicionar área e Borracha para remover marcações incorretas.",
        }

      case "redo-segmentation":
        return {
          title: "Refazer Segmentação Manual",
          description:
            "A segmentação da IA não será aproveitada. Desenhe manualmente a região correta da lesão.",
          badge: "Refazer marcação",
          modeText:
            "Use o pincel para desenhar a lesão e a borracha para remover marcações.",
        }

      case "no-segmentation":
        return {
          title: "Marcação Manual",
          description:
            "A IA não gerou uma segmentação confiável. Marque manualmente a região da lesão.",
          badge: "Sem segmentação inicial",
          modeText:
            "Use o pincel para desenhar a lesão e a borracha para remover marcações.",
        }

      default:
        return {
          title: "Ferramenta de Segmentação Manual",
          description:
            "Realize a correção manual da segmentação da endometriose.",
          badge: "Correção manual",
          modeText: "Realize a marcação manual da lesão.",
        }
    }
  }, [correctionType])

  if (!isOpen) return null

  const handleSave = () => {
    const payload = {
      correctionType,
      label: selectedClass,
      usedAiMask: useAiMask,
      maskUrl: effectiveMaskUrl,
      masks,
      savedAt: new Date().toISOString(),
    }

    console.log("Marcação manual salva:", payload)

    setSaved(true)
    setTimeout(() => setSaved(false), 1800)
  }

  const handleClear = () => {
    setMasks([])
    setSaved(false)
  }

  const handleIgnoreAiMask = () => {
    setUseAiMask(false)
    setMasks([])
    setTool("brush")
    setSaved(false)
  }

  const handleUseAiMaskAgain = () => {
    setUseAiMask(true)
    setMasks([])
    setTool("polygon")
    setSaved(false)
  }

  const showPolygonTool = isPartialAdjustment && useAiMask
  const showBrushSize = tool === "brush" || tool === "eraser"

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl h-[90vh] bg-background rounded-2xl shadow-2xl border flex flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold">{correctionInfo.title}</h2>

              <span className="rounded-full border px-3 py-1 text-xs font-medium text-muted-foreground">
                {correctionInfo.badge}
              </span>
            </div>

            <p className="text-sm text-muted-foreground mt-1">
              {correctionInfo.description}
            </p>
          </div>

          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <aside className="w-72 border-r p-4 space-y-5 bg-muted/20">
            <div className="rounded-xl border bg-background p-3">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 mt-0.5 text-muted-foreground" />

                <div>
                  <p className="text-sm font-medium">Modo de correção</p>

                  <p className="text-xs text-muted-foreground mt-1">
                    {correctionInfo.modeText}
                  </p>
                </div>
              </div>
            </div>

            {isPartialAdjustment && maskUrl && (
              <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 space-y-3">
                <div>
                  <p className="text-sm font-medium text-amber-600">
                    {useAiMask
                      ? "Máscara inicial da IA carregada"
                      : "Máscara da IA ignorada"}
                  </p>

                  <p className="text-xs text-muted-foreground mt-1">
                    {useAiMask
                      ? "Você pode ajustar a borda, adicionar áreas com pincel ou apagar regiões incorretas."
                      : "A marcação da IA foi removida. Desenhe a lesão manualmente sobre a imagem original."}
                  </p>
                </div>

                {useAiMask ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-2 justify-start"
                    onClick={handleIgnoreAiMask}
                  >
                    <Ban className="h-4 w-4" />
                    Ignorar máscara da IA
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-2 justify-start"
                    onClick={handleUseAiMaskAgain}
                  >
                    <RotateCcw className="h-4 w-4" />
                    Usar máscara da IA
                  </Button>
                )}
              </div>
            )}

            <div>
              <p className="text-sm font-medium mb-2">Ferramenta</p>

              <div className="space-y-2">
                {showPolygonTool && (
                  <Button
                    variant={tool === "polygon" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTool("polygon")}
                    className="gap-2 w-full justify-start"
                  >
                    <MousePointer2 className="h-4 w-4" />
                    Editar borda
                  </Button>
                )}

                <Button
                  variant={tool === "brush" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTool("brush")}
                  className="gap-2 w-full justify-start"
                >
                  <Brush className="h-4 w-4" />
                  Pincel
                </Button>

                <Button
                  variant={tool === "eraser" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTool("eraser")}
                  className="gap-2 w-full justify-start"
                >
                  <Eraser className="h-4 w-4" />
                  Borracha
                </Button>
              </div>
            </div>

            {showBrushSize && (
              <div>
                <p className="text-sm font-medium mb-2">
                  {tool === "eraser" ? "Tamanho da borracha" : "Tamanho do pincel"}
                </p>

                <input
                  type="range"
                  min={2}
                  max={40}
                  value={strokeSize}
                  onChange={(e) => setStrokeSize(Number(e.target.value))}
                  className="w-full"
                />

                <p className="text-xs text-muted-foreground mt-1">
                  {strokeSize}px
                </p>
              </div>
            )}

            <div>
              <p className="text-sm font-medium mb-2">Classe de marcação</p>

              <div className="space-y-2">
                {classes.map((item) => (
                  <button
                    key={item}
                    onClick={() => setSelectedClass(item)}
                    className={`w-full flex items-center gap-3 rounded-lg border px-3 py-2 text-sm transition ${
                      selectedClass === item
                        ? "bg-primary text-primary-foreground"
                        : "bg-background hover:bg-muted"
                    }`}
                  >
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: classToColor[item] }}
                    />
                    {item}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t space-y-2">
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={handleClear}
              >
                <Trash2 className="h-4 w-4" />
                Limpar marcações
              </Button>

              <Button className="w-full gap-2" onClick={handleSave}>
                <Save className="h-4 w-4" />
                Salvar marcação
              </Button>

              {saved && (
                <p className="text-sm text-green-600 text-center">
                  Marcação manual salva com sucesso.
                </p>
              )}
            </div>
          </aside>

          <main className="flex-1 flex flex-col items-center justify-center bg-black/90 p-6">
            <SegmentationCanvas
              imageUrl={imageUrl}
              maskUrl={effectiveMaskUrl}
              correctionType={correctionType}
              labelOfMarkClass={selectedClass}
              markTool={tool}
              strokeSize={strokeSize}
              markArray={masks}
              setMask={setMasks}
            />

            <p className="text-xs text-white/70 mt-4">
              Classe: {selectedClass} • Ferramenta:{" "}
              {tool === "polygon"
                ? "Editar borda"
                : tool === "brush"
                ? "Pincel"
                : "Borracha"}
            </p>
          </main>
        </div>
      </div>
    </div>
  )
}