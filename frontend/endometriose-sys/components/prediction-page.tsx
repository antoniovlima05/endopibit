"use client"

import type React from "react"
import { useState, useMemo, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Activity,
  ArrowLeft,
  Download,
  ChevronDown,
  Plus,
  Minus,
  X,
  Info,
  RefreshCcw,
  Save,
  CheckCircle2,
  Loader2,
  PenTool,
} from "lucide-react"

import SegmentationToolModal from "@/components/segmentation/segmentation-tool-modal"

type ApiExam = {
  examId: string
  pacienteId: string
  imagem_path: string
  original_filename?: string | null
  status: string
  resultado: string | null
  confianca: number | null
  processed_at?: string | null
  error_message?: string | null
}

type ManualCorrectionType =
  | "partial-adjustment"
  | "redo-segmentation"
  | "no-segmentation"

type SegmentResponse = {
  examId: string
  maskUrl: string
  overlayUrl: string
  correctionType: ManualCorrectionType
  segmentationMetrics?: any
}

type ValidationStatus = "correct" | "incorrect" | null

type ManualMarkingImage = {
  id: string
  url: string
  overlayUrl: string | null
  maskUrl: string | null
  patientId: string
  correctionType: ManualCorrectionType
  hasInitialMask: boolean
}

type ExamImage = {
  id: string
  url: string
  overlayUrl: string | null
  maskUrl: string | null
  correctionType: ManualCorrectionType | null
  aiClassification: "com" | "sem" | "—"
  confidence: number
  status: string
  resultado: string | null
  processed_at?: string | null
  error_message?: string | null
  original_filename?: string | null
}

function mapResultadoToClass(resultado: string | null): "com" | "sem" | "—" {
  if (!resultado) return "—"
  const r = resultado.toLowerCase()
  if (r.includes("neg") || r.includes("sem")) return "sem"
  if (r.includes("pos") || r.includes("com")) return "com"
  return "—"
}

function toAbsoluteUrl(api: string, url: string) {
  if (url.startsWith("http://") || url.startsWith("https://")) return url
  return `${api}${url}`
}

function getCorrectionLabel(type: ManualCorrectionType | null) {
  switch (type) {
    case "partial-adjustment":
      return "Ajuste parcial"
    case "redo-segmentation":
      return "Refazer do zero"
    case "no-segmentation":
      return "Sem segmentação"
    default:
      return "Correção automática"
  }
}

export default function PredictionPage({
  onBack,
  patientId,
  onSaveIncorrectSegmentations,
}: {
  onBack: () => void
  patientId: string
  onSaveIncorrectSegmentations?: (images: ManualMarkingImage[]) => void
}) {
  const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

  const [examImages, setExamImages] = useState<ExamImage[]>([])
  const [loading, setLoading] = useState(false)
  const [segmenting, setSegmenting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const [showClassification, setShowClassification] = useState(false)
  const [showSegmentation, setShowSegmentation] = useState(false)

  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [selectedCorrectionImage, setSelectedCorrectionImage] =
    useState<ExamImage | null>(null)

  const [imageZoom, setImageZoom] = useState(100)
  const [panX, setPanX] = useState(0)
  const [panY, setPanY] = useState(0)
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })

  const [classificationResults, setClassificationResults] = useState<
    Record<string, "com" | "sem" | "—">
  >({})

  const [classificationValidation, setClassificationValidation] = useState<
    Record<string, ValidationStatus>
  >({})

  const [segmentationValidation, setSegmentationValidation] = useState<
    Record<string, ValidationStatus>
  >({})

  const [segmentationSaved, setSegmentationSaved] = useState(false)

  const loadExams = async () => {
    setLoading(true)
    setErrorMsg(null)

    try {
      const res = await fetch(
        `${API}/api/exames/${encodeURIComponent(patientId)}`,
        { cache: "no-store" }
      )

      if (!res.ok) throw new Error(`Falha ao buscar exames (${res.status})`)

      const data: ApiExam[] = await res.json()

      const mapped: ExamImage[] = (Array.isArray(data) ? data : []).map((e) => {
        const cls = mapResultadoToClass(e.resultado)
        const conf =
          typeof e.confianca === "number" ? Math.round(e.confianca * 100) : 0

        return {
          id: e.examId,
          url: `${API}/api/exames/${encodeURIComponent(e.examId)}/file`,
          overlayUrl: null,
          maskUrl: null,
          correctionType: null,
          aiClassification: cls,
          confidence: conf,
          status: e.status,
          resultado: e.resultado,
          processed_at: e.processed_at ?? null,
          error_message: e.error_message ?? null,
          original_filename: e.original_filename ?? null,
        }
      })

      setExamImages(mapped)

      const results: Record<string, "com" | "sem" | "—"> = {}
      mapped.forEach((img) => {
        results[img.id] = img.aiClassification
      })

      setClassificationResults(results)
      setClassificationValidation({})
      setSegmentationValidation({})
      setSegmentationSaved(false)
      setShowClassification(false)
      setShowSegmentation(false)
      setSelectedCorrectionImage(null)
    } catch (err: any) {
      setErrorMsg(err?.message ?? "Erro ao carregar exames")
      setExamImages([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadExams()
  }, [patientId])

  const handleClassify = () => {
    setShowClassification(true)
    setShowSegmentation(false)
    setSegmentationSaved(false)
  }

  const segmentedImages = examImages.filter(
    (img) =>
      classificationResults[img.id] === "com" &&
      classificationValidation[img.id] === "correct"
  )

  const handleSegment = async () => {
    const validImages = examImages.filter(
      (img) =>
        classificationResults[img.id] === "com" &&
        classificationValidation[img.id] === "correct"
    )

    if (validImages.length === 0) {
      alert(
        "Valide pelo menos uma imagem como 'Com Endometriose' e 'Correto' antes de segmentar."
      )
      return
    }

    setSegmenting(true)
    setErrorMsg(null)

    try {
      const segmentResults = await Promise.all(
        validImages.map(async (img) => {
          const res = await fetch(
            `${API}/api/exames/${encodeURIComponent(img.id)}/segmentar`,
            { method: "POST" }
          )

          const payload = await res.json().catch(() => ({}))

          if (!res.ok) {
            throw new Error(
              payload?.erro ??
                payload?.error ??
                `Falha ao segmentar exame ${img.id} (${res.status})`
            )
          }

          return payload as SegmentResponse
        })
      )

      const overlayByExamId = new Map<string, string>()
      const maskByExamId = new Map<string, string>()
      const correctionByExamId = new Map<string, ManualCorrectionType>()

      segmentResults.forEach((result) => {
        overlayByExamId.set(result.examId, toAbsoluteUrl(API, result.overlayUrl))
        maskByExamId.set(result.examId, toAbsoluteUrl(API, result.maskUrl))
        correctionByExamId.set(result.examId, result.correctionType)
      })

      setExamImages((prev) =>
        prev.map((img) => ({
          ...img,
          overlayUrl: overlayByExamId.get(img.id) ?? img.overlayUrl,
          maskUrl: maskByExamId.get(img.id) ?? img.maskUrl,
          correctionType: correctionByExamId.get(img.id) ?? img.correctionType,
        }))
      )

      setShowSegmentation(true)
      setShowClassification(false)
      setSegmentationSaved(false)
    } catch (err: any) {
      alert(err?.message ?? "Erro ao executar segmentação.")
    } finally {
      setSegmenting(false)
    }
  }

  const handleClassificationValidation = (
    id: string,
    value: "correct" | "incorrect"
  ) => {
    setClassificationValidation((prev) => ({
      ...prev,
      [id]: prev[id] === value ? null : value,
    }))
  }

  const handleSegmentationValidation = (
    image: ExamImage,
    value: "correct" | "incorrect"
  ) => {
    setSegmentationSaved(false)

    setSegmentationValidation((prev) => ({
      ...prev,
      [image.id]: prev[image.id] === value ? null : value,
    }))

    if (value === "incorrect") {
      setSelectedCorrectionImage(image)
    }
  }

  const handleSaveSegmentationValidation = () => {
    const hasAnyValidation = segmentedImages.some(
      (img) =>
        segmentationValidation[img.id] === "correct" ||
        segmentationValidation[img.id] === "incorrect"
    )

    if (!hasAnyValidation) {
      alert(
        "Marque pelo menos uma segmentação como Correta ou Incorreta antes de salvar."
      )
      return
    }

    const incorrectImages: ManualMarkingImage[] = segmentedImages
      .filter((img) => segmentationValidation[img.id] === "incorrect")
      .map((img) => {
        const correctionType = img.correctionType ?? "redo-segmentation"

        return {
          id: img.id,
          url: img.url,
          overlayUrl: img.overlayUrl,
          maskUrl: img.maskUrl,
          patientId,
          correctionType,
          hasInitialMask: correctionType === "partial-adjustment",
        }
      })

    if (incorrectImages.length > 0) {
      onSaveIncorrectSegmentations?.(incorrectImages)
    }

    setSegmentationSaved(true)
  }

  const handleImageClick = (id: string) => {
    setSelectedImage(id)
    setImageZoom(100)
    setPanX(0)
    setPanY(0)
  }

  const handleCloseModal = () => {
    setSelectedImage(null)
    setImageZoom(100)
    setPanX(0)
    setPanY(0)
  }

  const handleZoomIn = () => setImageZoom((prev) => Math.min(prev + 25, 400))
  const handleZoomOut = () => setImageZoom((prev) => Math.max(prev - 25, 50))

  const handleMouseDown = (e: React.MouseEvent) => {
    if (imageZoom <= 100) return
    setIsPanning(true)
    setPanStart({ x: e.clientX - panX, y: e.clientY - panY })
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isPanning) return
    setPanX(e.clientX - panStart.x)
    setPanY(e.clientY - panStart.y)
  }

  const handleMouseUp = () => setIsPanning(false)

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault()
    if (e.deltaY < 0) handleZoomIn()
    else handleZoomOut()
  }

  const semImages = examImages.filter(
    (img) => classificationResults[img.id] === "sem"
  )

  const comImages = examImages.filter(
    (img) => classificationResults[img.id] === "com"
  )

  const selectedImg = examImages.find((img) => img.id === selectedImage)

  const averageConfidence = useMemo(() => {
    if (examImages.length === 0) return 0
    const sum = examImages.reduce((acc, img) => acc + img.confidence, 0)
    return Math.round(sum / examImages.length)
  }, [examImages])

  useEffect(() => {
    document.body.style.overflow = selectedImage !== null ? "hidden" : ""
    return () => {
      document.body.style.overflow = ""
    }
  }, [selectedImage])

  const getSegmentationCardStyle = (id: string) => {
    if (segmentationValidation[id] === "correct") {
      return "border-emerald-500 bg-emerald-50/60"
    }

    if (segmentationValidation[id] === "incorrect") {
      return "border-red-500 bg-red-50/60"
    }

    return ""
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <nav className="border-b bg-card">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>

            <div className="flex items-center gap-2 text-primary">
              <Activity className="h-6 w-6" />
              <span className="text-2xl font-semibold">EndometrioSys</span>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={loadExams}
            disabled={loading || segmenting}
            className="gap-2"
          >
            <RefreshCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            {loading ? "Atualizando..." : "Atualizar"}
          </Button>
        </div>
      </nav>

      <main className="flex-1 container mx-auto px-6 py-8">
        <div className="flex gap-8">
          <div className="flex-1">
            <div className="mb-8">
              <h1 className="text-4xl font-bold tracking-tight">
                Análise de Exame
              </h1>

              <p className="text-muted-foreground mt-2">
                Paciente ID: <strong>{patientId}</strong>
              </p>

              {errorMsg && <p className="text-destructive mt-2">{errorMsg}</p>}
            </div>

            <Card className="shadow-sm">
              <CardContent className="p-8">
                {!showClassification && !showSegmentation && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                    {examImages.map((img) => (
                      <Card
                        key={img.id}
                        className="group cursor-pointer overflow-hidden hover:ring-2 hover:ring-primary/50 transition-all"
                        onClick={() => handleImageClick(img.id)}
                      >
                        <div className="relative aspect-video bg-gray-100">
                          <img
                            src={img.url}
                            alt={`Exame ${img.id}`}
                            className="object-cover w-full h-full"
                            onError={(e) => {
                              e.currentTarget.src = "/placeholder.svg"
                            }}
                          />
                        </div>

                        <p className="text-center py-4 text-sm font-medium">
                          Exame {img.id}
                        </p>
                      </Card>
                    ))}

                    {examImages.length === 0 && !loading && (
                      <p className="text-muted-foreground">
                        Nenhum exame encontrado para este paciente.
                      </p>
                    )}
                  </div>
                )}

                {showClassification && !showSegmentation && (
                  <div className="space-y-12">
                    <div className="bg-emerald-50/80 p-8 rounded-2xl">
                      <h3 className="font-semibold text-xl mb-6 text-emerald-700">
                        Sem Endometriose
                      </h3>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {semImages.map((img) => (
                          <div key={img.id} className="space-y-4">
                            <Card
                              className="overflow-hidden cursor-pointer"
                              onClick={() => handleImageClick(img.id)}
                            >
                              <img src={img.url} alt="" className="w-full" />
                            </Card>

                            <div className="flex justify-center gap-8">
                              <label className="flex items-center gap-2 cursor-pointer">
                                <Checkbox
                                  checked={
                                    classificationValidation[img.id] === "correct"
                                  }
                                  onCheckedChange={() =>
                                    handleClassificationValidation(
                                      img.id,
                                      "correct"
                                    )
                                  }
                                />
                                <span className="text-emerald-600 font-medium">
                                  Correto
                                </span>
                              </label>

                              <label className="flex items-center gap-2 cursor-pointer">
                                <Checkbox
                                  checked={
                                    classificationValidation[img.id] ===
                                    "incorrect"
                                  }
                                  onCheckedChange={() =>
                                    handleClassificationValidation(
                                      img.id,
                                      "incorrect"
                                    )
                                  }
                                />
                                <span className="text-red-600 font-medium">
                                  Incorreto
                                </span>
                              </label>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-red-50/80 p-8 rounded-2xl">
                      <h3 className="font-semibold text-xl mb-6 text-red-700">
                        Com Endometriose
                      </h3>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {comImages.map((img) => (
                          <div key={img.id} className="space-y-4">
                            <Card
                              className="overflow-hidden cursor-pointer"
                              onClick={() => handleImageClick(img.id)}
                            >
                              <img src={img.url} alt="" className="w-full" />
                            </Card>

                            <div className="flex justify-center gap-8">
                              <label className="flex items-center gap-2 cursor-pointer">
                                <Checkbox
                                  checked={
                                    classificationValidation[img.id] === "correct"
                                  }
                                  onCheckedChange={() =>
                                    handleClassificationValidation(
                                      img.id,
                                      "correct"
                                    )
                                  }
                                />
                                <span className="text-emerald-600 font-medium">
                                  Correto
                                </span>
                              </label>

                              <label className="flex items-center gap-2 cursor-pointer">
                                <Checkbox
                                  checked={
                                    classificationValidation[img.id] ===
                                    "incorrect"
                                  }
                                  onCheckedChange={() =>
                                    handleClassificationValidation(
                                      img.id,
                                      "incorrect"
                                    )
                                  }
                                />
                                <span className="text-red-600 font-medium">
                                  Incorreto
                                </span>
                              </label>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {showSegmentation && (
                  <div className="bg-muted/60 p-8 rounded-2xl">
                    <h3 className="font-semibold mb-3 text-lg">
                      Imagens Segmentadas
                    </h3>

                    <p className="text-muted-foreground mb-8">
                      Valide se a segmentação gerada pela IA está correta. Se
                      marcar como incorreta, a ferramenta de correção será aberta
                      automaticamente.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                      {segmentedImages.map((img) => (
                        <Card
                          key={img.id}
                          className={`overflow-hidden border-2 transition-all hover:ring-2 hover:ring-primary ${getSegmentationCardStyle(
                            img.id
                          )}`}
                        >
                          <div
                            className="cursor-pointer"
                            onClick={() => handleImageClick(img.id)}
                          >
                            <img
                              src={img.overlayUrl || img.url}
                              alt={`Exame ${img.id}`}
                              className="w-full"
                            />
                          </div>

                          <div className="p-4 space-y-4">
                            <p className="text-center text-sm font-medium">
                              Exame {img.id}
                            </p>

                            {img.correctionType && (
                              <p className="text-center text-xs text-muted-foreground">
                                Correção sugerida pela IA:{" "}
                                <strong>{getCorrectionLabel(img.correctionType)}</strong>
                              </p>
                            )}

                            <div className="flex justify-center gap-8">
                              <label className="flex items-center gap-2 cursor-pointer">
                                <Checkbox
                                  checked={
                                    segmentationValidation[img.id] === "correct"
                                  }
                                  onCheckedChange={() =>
                                    handleSegmentationValidation(img, "correct")
                                  }
                                />
                                <span className="text-emerald-600 font-medium">
                                  Correto
                                </span>
                              </label>

                              <label className="flex items-center gap-2 cursor-pointer">
                                <Checkbox
                                  checked={
                                    segmentationValidation[img.id] ===
                                    "incorrect"
                                  }
                                  onCheckedChange={() =>
                                    handleSegmentationValidation(img, "incorrect")
                                  }
                                />
                                <span className="text-red-600 font-medium">
                                  Incorreto
                                </span>
                              </label>
                            </div>

                            {segmentationValidation[img.id] === "incorrect" && (
                              <Button
                                className="w-full gap-2"
                                onClick={() => setSelectedCorrectionImage(img)}
                              >
                                <PenTool className="h-4 w-4" />
                                Abrir correção
                              </Button>
                            )}
                          </div>
                        </Card>
                      ))}
                    </div>

                    <div className="mt-8 flex flex-col items-end gap-3">
                      <Button
                        className="gap-2 px-8"
                        onClick={handleSaveSegmentationValidation}
                      >
                        <Save className="h-4 w-4" />
                        Finalizar Validação
                      </Button>

                      {segmentationSaved && (
                        <div className="flex items-center gap-2 text-sm font-medium text-emerald-600">
                          <CheckCircle2 className="h-4 w-4" />
                          Validação médica salva com sucesso.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>

              <div className="p-6 border-t flex gap-4">
                <Button
                  onClick={handleClassify}
                  className="flex-1"
                  variant={
                    showClassification && !showSegmentation
                      ? "default"
                      : "outline"
                  }
                  disabled={segmenting}
                >
                  Classificar
                </Button>

                <Button
                  onClick={handleSegment}
                  className="flex-1"
                  disabled={!showClassification || segmenting}
                >
                  {segmenting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Segmentando...
                    </>
                  ) : (
                    "Segmentar"
                  )}
                </Button>
              </div>
            </Card>
          </div>

          <div className="w-80 shrink-0">
            <Card className="sticky top-6">
              <CardContent className="p-6 space-y-6">
                <div>
                  <h3 className="font-semibold flex items-center gap-2 mb-3">
                    <Info className="h-4 w-4" />
                    Resultado da Análise
                  </h3>

                  <p className="text-sm text-muted-foreground">
                    {segmenting
                      ? "Executando segmentação por IA. Aguarde..."
                      : showSegmentation
                      ? segmentationSaved
                        ? "Validação médica registrada com sucesso."
                        : "Máscaras geradas. Valide a qualidade da segmentação."
                      : showClassification
                      ? "Classificação concluída. Valide os resultados antes de avançar para segmentação."
                      : "Execute uma ação para continuar."}
                  </p>

                  {averageConfidence > 0 && (
                    <p className="mt-4 text-sm">
                      Confiança média:{" "}
                      <strong className="font-semibold">
                        {averageConfidence}%
                      </strong>
                    </p>
                  )}
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-full">
                      <Download className="mr-2 h-4 w-4" />
                      Exportar relatório
                      <ChevronDown className="ml-2 h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>PDF Completo</DropdownMenuItem>
                    <DropdownMenuItem>Imagens + Máscaras</DropdownMenuItem>
                    <DropdownMenuItem>DICOM Export</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {selectedCorrectionImage && (
        <SegmentationToolModal
          isOpen={!!selectedCorrectionImage}
          imageUrl={selectedCorrectionImage.url}
          maskUrl={
            selectedCorrectionImage.correctionType === "partial-adjustment"
              ? selectedCorrectionImage.maskUrl
              : null
          }
          correctionType={
            selectedCorrectionImage.correctionType ?? "redo-segmentation"
          }
          hasInitialMask={
            selectedCorrectionImage.correctionType === "partial-adjustment"
          }
          onClose={() => setSelectedCorrectionImage(null)}
        />
      )}

      {selectedImage !== null && selectedImg && (
        <div
          className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center p-4"
          onClick={handleCloseModal}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl w-[min(94vw,94vh)] h-[min(94vw,94vh)] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b bg-gray-50 flex justify-between items-start">
              <div>
                <h3 className="text-2xl font-semibold">
                  Exame {selectedImg.id}
                </h3>

                {(showClassification || showSegmentation) && (
                  <>
                    <p className="mt-1 text-sm">
                      Classificação IA:{" "}
                      <strong
                        className={
                          selectedImg.aiClassification === "com"
                            ? "text-red-600"
                            : "text-emerald-600"
                        }
                      >
                        {selectedImg.aiClassification === "com"
                          ? "Com Endometriose"
                          : selectedImg.aiClassification === "sem"
                          ? "Sem Endometriose"
                          : "Não disponível"}
                      </strong>
                    </p>

                    <p className="text-sm text-muted-foreground mt-0.5">
                      Confiança do modelo:{" "}
                      <strong>{selectedImg.confidence}%</strong>
                    </p>
                  </>
                )}

                {showSegmentation && selectedImg.overlayUrl && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    Visualização com máscara sobreposta
                  </p>
                )}
              </div>

              <Button size="icon" variant="ghost" onClick={handleCloseModal}>
                <X className="h-6 w-6" />
              </Button>
            </div>

            <div className="flex-1 bg-black relative flex items-center justify-center overflow-hidden">
              <div
                className="w-full h-full flex items-center justify-center select-none cursor-grab active:cursor-grabbing"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onWheel={handleWheel}
              >
                <img
                  src={
                    showSegmentation && selectedImg.overlayUrl
                      ? selectedImg.overlayUrl
                      : selectedImg.url
                  }
                  alt={`Exame ${selectedImg.id}`}
                  className="max-w-none"
                  style={{
                    transform: `translate(${panX}px, ${panY}px) scale(${
                      imageZoom / 100
                    })`,
                    transformOrigin: "center center",
                    transition: isPanning ? "none" : "transform 0.2s ease-out",
                  }}
                  draggable={false}
                />
              </div>

              <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur px-6 py-3 rounded-full shadow-2xl flex items-center gap-5">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={handleZoomOut}
                  disabled={imageZoom <= 50}
                >
                  <Minus className="h-5 w-5" />
                </Button>

                <span className="font-mono text-base font-semibold w-16 text-center">
                  {imageZoom}%
                </span>

                <Button
                  size="icon"
                  variant="ghost"
                  onClick={handleZoomIn}
                  disabled={imageZoom >= 400}
                >
                  <Plus className="h-5 w-5" />
                </Button>
              </div>

              <div className="absolute top-6 left-6 bg-black/70 text-white/90 text-xs px-4 py-2 rounded-xl">
                Role o mouse • Arraste para mover
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}