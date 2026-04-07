"use client"

import type React from "react"
import { useState, useMemo, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Activity, ArrowLeft, Download, ChevronDown, Plus, Minus, X, Info, RefreshCcw } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"

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

type ExamImage = {
  id: string
  url: string
  overlayUrl: string | null          // ← Novo: suporte a máscara
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

export default function PredictionPage({
  onBack,
  patientId,
}: {
  onBack: () => void
  patientId: string
}) {
  const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

  const [examImages, setExamImages] = useState<ExamImage[]>([])
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const [showClassification, setShowClassification] = useState(false)
  const [showSegmentation, setShowSegmentation] = useState(false)

  const [selectedImage, setSelectedImage] = useState<string | null>(null)

  const [imageZoom, setImageZoom] = useState(100)
  const [panX, setPanX] = useState(0)
  const [panY, setPanY] = useState(0)
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })

  const [classificationResults, setClassificationResults] = useState<Record<string, "com" | "sem" | "—">>({})
  const [classificationValidation, setClassificationValidation] = useState<Record<string, "correct" | "incorrect" | null>>({})

  // ==================== CARREGAR EXAMES ====================
  const loadExams = async () => {
    setLoading(true)
    setErrorMsg(null)
    try {
      const res = await fetch(`${API}/api/exames/${encodeURIComponent(patientId)}`, { cache: "no-store" })
      if (!res.ok) throw new Error(`Falha ao buscar exames (${res.status})`)

      const data: ApiExam[] = await res.json()

      const mapped: ExamImage[] = (Array.isArray(data) ? data : []).map((e) => {
        const cls = mapResultadoToClass(e.resultado)
        const conf = typeof e.confianca === "number" ? Math.round(e.confianca * 100) : 0

        return {
          id: e.examId,
          url: `${API}/api/exames/${encodeURIComponent(e.examId)}/file`,
          overlayUrl: null,                    // ← Será preenchido quando tiver segmentação
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
      mapped.forEach((img) => (results[img.id] = img.aiClassification))
      setClassificationResults(results)

      setShowClassification(false)
      setShowSegmentation(false)
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

  // ==================== HANDLERS ====================
  const handleClassify = () => {
    setShowClassification(true)
    setShowSegmentation(false)
  }

  const handleSegment = () => {
    const validComImages = Object.entries(classificationResults)
      .filter(([id, cls]) => cls === "com" && classificationValidation[id] === "correct")

    if (validComImages.length === 0) {
      alert("Valide pelo menos uma imagem como 'Com Endometriose' e 'Correto' antes de segmentar.")
      return
    }

    setShowSegmentation(true)
    setShowClassification(false)
    // TODO: Aqui você pode chamar a API de segmentação no futuro
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

  const handleValidation = (id: string, value: "correct" | "incorrect") => {
    setClassificationValidation((prev) => ({
      ...prev,
      [id]: prev[id] === value ? null : value,
    }))
  }

  // ==================== COMPUTED ====================
  const semImages = examImages.filter((img) => classificationResults[img.id] === "sem")
  const comImages = examImages.filter((img) => classificationResults[img.id] === "com")

  const segmentedImages = examImages.filter(
    (img) => img.overlayUrl && classificationResults[img.id] === "com" && classificationValidation[img.id] === "correct"
  )

  const selectedImg = examImages.find((img) => img.id === selectedImage)

  const averageConfidence = useMemo(() => {
    if (examImages.length === 0) return 0
    const sum = examImages.reduce((acc, img) => acc + img.confidence, 0)
    return Math.round(sum / examImages.length)
  }, [examImages])

  useEffect(() => {
    document.body.style.overflow = selectedImage !== null ? "hidden" : ""
    return () => { document.body.style.overflow = "" }
  }, [selectedImage])

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <nav className="border-b bg-card">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
            </Button>
            <div className="flex items-center gap-2 text-primary">
              <Activity className="h-6 w-6" />
              <span className="text-2xl font-semibold">EndometrioSys</span>
            </div>
          </div>

          <Button variant="outline" size="sm" onClick={loadExams} disabled={loading} className="gap-2">
            <RefreshCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            {loading ? "Atualizando..." : "Atualizar"}
          </Button>
        </div>
      </nav>

      <main className="flex-1 container mx-auto px-6 py-8">
        <div className="flex gap-8">
          <div className="flex-1">
            <div className="mb-8">
              <h1 className="text-4xl font-bold tracking-tight">Análise de Exame</h1>
              <p className="text-muted-foreground mt-2">
                Paciente ID: <strong>{patientId}</strong>
              </p>
              {errorMsg && <p className="text-destructive mt-2">{errorMsg}</p>}
            </div>

            <Card className="shadow-sm">
              <CardContent className="p-8">
                {/* Grid inicial de imagens */}
                {!showClassification && !showSegmentation && (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-6">
                    {examImages.map((img) => (
                      <Card
                        key={img.id}
                        className="group cursor-pointer overflow-hidden hover:ring-2 hover:ring-primary/50 transition-all duration-200"
                        onClick={() => handleImageClick(img.id)}
                      >
                        <div className="relative aspect-video bg-gray-100">
                          <img
                            src={img.url}
                            alt={`Exame ${img.id}`}
                            className="object-cover w-full h-full"
                            onError={(e) => (e.currentTarget.src = "/placeholder.svg")}
                          />
                        </div>
                        <p className="text-center py-4 text-sm font-medium">Exame {img.id}</p>
                      </Card>
                    ))}
                    {examImages.length === 0 && !loading && (
                      <p className="text-muted-foreground">Nenhum exame encontrado para este paciente.</p>
                    )}
                  </div>
                )}

                {/* Tela de Classificação */}
                {showClassification && !showSegmentation && (
                  <div className="space-y-12">
                    <div className="bg-emerald-50/80 p-8 rounded-2xl">
                      <h3 className="font-semibold text-xl mb-6 text-emerald-700">Sem Endometriose</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {semImages.map((img) => (
                          <div key={img.id} className="space-y-4">
                            <Card className="overflow-hidden cursor-pointer" onClick={() => handleImageClick(img.id)}>
                              <img src={img.url} alt="" className="w-full" />
                            </Card>
                            <div className="flex justify-center gap-8">
                              <label className="flex items-center gap-2 cursor-pointer">
                                <Checkbox checked={classificationValidation[img.id] === "correct"} onCheckedChange={() => handleValidation(img.id, "correct")} />
                                <span className="text-emerald-600 font-medium">Correto</span>
                              </label>
                              <label className="flex items-center gap-2 cursor-pointer">
                                <Checkbox checked={classificationValidation[img.id] === "incorrect"} onCheckedChange={() => handleValidation(img.id, "incorrect")} />
                                <span className="text-red-600 font-medium">Incorreto</span>
                              </label>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-red-50/80 p-8 rounded-2xl">
                      <h3 className="font-semibold text-xl mb-6 text-red-700">Com Endometriose</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {comImages.map((img) => (
                          <div key={img.id} className="space-y-4">
                            <Card className="overflow-hidden cursor-pointer" onClick={() => handleImageClick(img.id)}>
                              <img src={img.url} alt="" className="w-full" />
                            </Card>
                            <div className="flex justify-center gap-8">
                              <label className="flex items-center gap-2 cursor-pointer">
                                <Checkbox checked={classificationValidation[img.id] === "correct"} onCheckedChange={() => handleValidation(img.id, "correct")} />
                                <span className="text-emerald-600 font-medium">Correto</span>
                              </label>
                              <label className="flex items-center gap-2 cursor-pointer">
                                <Checkbox checked={classificationValidation[img.id] === "incorrect"} onCheckedChange={() => handleValidation(img.id, "incorrect")} />
                                <span className="text-red-600 font-medium">Incorreto</span>
                              </label>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Tela de Segmentação */}
                {showSegmentation && (
                  <div className="bg-muted/60 p-8 rounded-2xl">
                    <h3 className="font-semibold mb-3 text-lg">Imagens Segmentadas</h3>
                    <p className="text-muted-foreground mb-8">Clique em qualquer imagem para visualizar com máscara sobreposta.</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                      {segmentedImages.map((img) => (
                        <Card
                          key={img.id}
                          className="cursor-pointer hover:ring-2 hover:ring-primary transition-all overflow-hidden"
                          onClick={() => handleImageClick(img.id)}
                        >
                          <img 
                            src={img.overlayUrl || img.url} 
                            alt={`Imagem ${img.id}`} 
                            className="w-full" 
                          />
                          <p className="text-center py-4 text-sm font-medium">Exame {img.id}</p>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>

              <div className="p-6 border-t flex gap-4">
                <Button
                  onClick={handleClassify}
                  className="flex-1"
                  variant={showClassification && !showSegmentation ? "default" : "outline"}
                >
                  Classificar
                </Button>
                <Button
                  onClick={handleSegment}
                  className="flex-1"
                  disabled={!showClassification}
                >
                  Segmentar
                </Button>
              </div>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="w-80 shrink-0">
            <Card className="sticky top-6">
              <CardContent className="p-6 space-y-6">
                <div>
                  <h3 className="font-semibold flex items-center gap-2 mb-3">
                    <Info className="h-4 w-4" /> Resultado da Análise
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {showSegmentation
                      ? "Máscaras geradas com sucesso."
                      : showClassification
                      ? "Classificação concluída."
                      : "Execute uma ação para continuar."}
                  </p>
                  {averageConfidence > 0 && (
                    <p className="mt-4 text-sm">
                      Confiança média: <strong className="font-semibold">{averageConfidence}%</strong>
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

      {/* ====================== MODAL DE VISUALIZAÇÃO ====================== */}
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
                <h3 className="text-2xl font-semibold">Exame {selectedImg.id}</h3>
                {(showClassification || showSegmentation) && (
                  <>
                    <p className="mt-1 text-sm">
                      Classificação IA:{" "}
                      <strong className={selectedImg.aiClassification === "com" ? "text-red-600" : "text-emerald-600"}>
                        {selectedImg.aiClassification === "com" ? "Com Endometriose" : "Sem Endometriose"}
                      </strong>
                    </p>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      Confiança do modelo: <strong>{selectedImg.confidence}%</strong>
                    </p>
                  </>
                )}
                {showSegmentation && selectedImg.overlayUrl && (
                  <p className="mt-1 text-sm text-muted-foreground">Visualização com máscara sobreposta</p>
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
                  src={showSegmentation && selectedImg.overlayUrl ? selectedImg.overlayUrl : selectedImg.url}
                  alt={`Exame ${selectedImg.id}`}
                  className="max-w-none"
                  style={{
                    transform: `translate(${panX}px, ${panY}px) scale(${imageZoom / 100})`,
                    transformOrigin: "center center",
                    transition: isPanning ? "none" : "transform 0.2s ease-out",
                  }}
                  draggable={false}
                />
              </div>

              {/* Controles de Zoom */}
              <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur px-6 py-3 rounded-full shadow-2xl flex items-center gap-5">
                <Button size="icon" variant="ghost" onClick={handleZoomOut} disabled={imageZoom <= 50}>
                  <Minus className="h-5 w-5" />
                </Button>
                <span className="font-mono text-base font-semibold w-16 text-center">{imageZoom}%</span>
                <Button size="icon" variant="ghost" onClick={handleZoomIn} disabled={imageZoom >= 400}>
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