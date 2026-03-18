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
  status: string // label PT no seu backend atual (ex: "Concluído")
  resultado: string | null
  confianca: number | null // 0..1
  processed_at?: string | null
  error_message?: string | null
  model_name?: string | null
  model_version?: string | null
}

type ExamImage = {
  id: string
  url: string
  aiClassification: "com" | "sem" | "—"
  mask: string | null
  confidence: number // 0..100
  status: string
  resultado: string | null
  processed_at?: string | null
  error_message?: string | null
  original_filename?: string | null
}

function mapResultadoToClass(resultado: string | null): "com" | "sem" | "—" {
  if (!resultado) return "—"
  const r = resultado.toLowerCase()

  // ajuste aqui conforme seus rótulos reais depois
  if (r.includes("neg")) return "sem"
  if (r.includes("pos")) return "com"

  // fallback
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

  const [showClassification, setShowClassification] = useState(true)
  const [showSegmentation, setShowSegmentation] = useState(false)

  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [isViewingMask, setIsViewingMask] = useState(false)

  const [imageZoom, setImageZoom] = useState(100)
  const [panX, setPanX] = useState(0)
  const [panY, setPanY] = useState(0)
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })

  const [classificationResults, setClassificationResults] = useState<Record<string, "com" | "sem" | "—">>({})
  const [classificationValidation, setClassificationValidation] = useState<Record<string, "correct" | "incorrect" | null>>({})

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
          url: `${API}/api/exames/${encodeURIComponent(e.examId)}/file`, // 👈 precisa do endpoint no backend
          aiClassification: cls,
          mask: null, // segmentação depois
          confidence: conf,
          status: e.status,
          resultado: e.resultado,
          processed_at: e.processed_at ?? null,
          error_message: e.error_message ?? null,
          original_filename: e.original_filename ?? null,
        }
      })

      setExamImages(mapped)

      // inicializa classificação com o que veio do backend
      const results: Record<string, "com" | "sem" | "—"> = {}
      mapped.forEach((img) => (results[img.id] = img.aiClassification))
      setClassificationResults(results)

      setShowClassification(true)
      setShowSegmentation(false)
    } catch (err: any) {
      setErrorMsg(err?.message ?? "Erro ao carregar exames")
      setExamImages([])
      setClassificationResults({})
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadExams()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId])

  const handleClassify = () => {
    setShowClassification(true)
    setShowSegmentation(false)
  }

  const handleSegment = () => {
    alert("Segmentação será integrada depois 🙂")
  }

  const handleImageClick = (id: string, isMask = false) => {
    setSelectedImage(id)
    setIsViewingMask(isMask)
    setImageZoom(100)
    setPanX(0)
    setPanY(0)
  }

  const handleCloseModal = () => {
    setSelectedImage(null)
    setIsViewingMask(false)
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

  const handleValidation = (id: string, value: "correct" | "incorrect") => {
    setClassificationValidation((prev) => ({
      ...prev,
      [id]: prev[id] === value ? null : value,
    }))
  }

  const semImages = examImages.filter((img) => classificationResults[img.id] === "sem")
  const comImages = examImages.filter((img) => classificationResults[img.id] === "com")

  const selectedImg = examImages.find((img) => img.id === selectedImage)

  const averageConfidence = useMemo(() => {
    if (examImages.length === 0) return 0
    const sum = examImages.reduce((acc, img) => acc + (img.confidence || 0), 0)
    return Math.round(sum / examImages.length)
  }, [examImages])

  useEffect(() => {
    if (selectedImage !== null) document.body.style.overflow = "hidden"
    else document.body.style.overflow = ""
    return () => {
      document.body.style.overflow = ""
    }
  }, [selectedImage])

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <nav className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Button>
          <div className="flex items-center gap-2 text-primary">
            <Activity className="h-6 w-6" />
            <span className="text-xl font-semibold">EndometrioseSys</span>
          </div>

          <div className="ml-auto">
            <Button variant="outline" size="sm" onClick={loadExams} disabled={loading} className="gap-2">
              <RefreshCcw className="h-4 w-4" />
              {loading ? "Atualizando..." : "Atualizar"}
            </Button>
          </div>
        </div>
      </nav>

      <main className="flex-1 container mx-auto px-4 py-6 flex gap-6">
        <div className="flex-1 flex flex-col">
          <div className="mb-4">
            <h1 className="text-2xl font-semibold">Análise de Exame</h1>
            <p className="text-sm text-muted-foreground">Paciente ID: {patientId}</p>
            {errorMsg && <p className="text-sm text-destructive mt-2">{errorMsg}</p>}
          </div>

          <Card className="flex-1 flex flex-col overflow-hidden">
            <CardContent className="flex-1 overflow-auto p-6">
              {!showClassification && !showSegmentation && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {examImages.map((img) => (
                    <Card
                      key={img.id}
                      className="cursor-pointer hover:ring-2 ring-primary transition-all"
                      onClick={() => handleImageClick(img.id, false)}
                    >
                      <img src={img.url} alt="" className="w-full h-auto rounded-md" />
                    </Card>
                  ))}
                  {examImages.length === 0 && !loading && (
                    <div className="text-sm text-muted-foreground">Nenhum exame encontrado.</div>
                  )}
                </div>
              )}

              {showClassification && !showSegmentation && (
                <div className="space-y-8">
                  <div className="bg-gray-100 p-5 rounded-lg">
                    <h3 className="font-semibold mb-3 text-green-700">Sem Endometriose</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {semImages.map((img) => (
                        <div key={img.id} className="space-y-2">
                          <Card className="cursor-pointer hover:ring-2 ring-primary" onClick={() => handleImageClick(img.id, false)}>
                            <img src={img.url} alt="" className="w-full h-auto rounded-md" />
                          </Card>
                          <div className="flex justify-center gap-3">
                            <label className="flex items-center gap-1 text-xs">
                              <Checkbox checked={classificationValidation[img.id] === "correct"} onCheckedChange={() => handleValidation(img.id, "correct")} />
                              <span className="text-green-600">Correto</span>
                            </label>
                            <label className="flex items-center gap-1 text-xs">
                              <Checkbox checked={classificationValidation[img.id] === "incorrect"} onCheckedChange={() => handleValidation(img.id, "incorrect")} />
                              <span className="text-red-600">Incorreto</span>
                            </label>
                          </div>
                        </div>
                      ))}
                      {semImages.length === 0 && <div className="text-sm text-muted-foreground">Nenhuma imagem classificada como "sem".</div>}
                    </div>
                  </div>

                  <div className="bg-red-50 p-5 rounded-lg">
                    <h3 className="font-semibold mb-3 text-red-700">Com Endometriose</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {comImages.map((img) => (
                        <div key={img.id} className="space-y-2">
                          <Card className="cursor-pointer hover:ring-2 ring-primary" onClick={() => handleImageClick(img.id, false)}>
                            <img src={img.url} alt="" className="w-full h-auto rounded-md" />
                          </Card>
                          <div className="flex justify-center gap-3">
                            <label className="flex items-center gap-1 text-xs">
                              <Checkbox checked={classificationValidation[img.id] === "correct"} onCheckedChange={() => handleValidation(img.id, "correct")} />
                              <span className="text-green-600">Correto</span>
                            </label>
                            <label className="flex items-center gap-1 text-xs">
                              <Checkbox checked={classificationValidation[img.id] === "incorrect"} onCheckedChange={() => handleValidation(img.id, "incorrect")} />
                              <span className="text-red-600">Incorreto</span>
                            </label>
                          </div>
                        </div>
                      ))}
                      {comImages.length === 0 && <div className="text-sm text-muted-foreground">Nenhuma imagem classificada como "com".</div>}
                    </div>
                  </div>
                </div>
              )}

              {showSegmentation && (
                <div className="bg-muted p-6 rounded-lg">
                  <h3 className="font-semibold mb-3">Máscaras Ilustrativas</h3>
                  <p className="text-sm text-muted-foreground mb-4">Segmentação será integrada depois.</p>
                </div>
              )}
            </CardContent>

            <div className="p-4 border-t flex gap-3">
              <Button onClick={handleClassify} className="flex-1" variant={showClassification ? "default" : "outline"}>
                Classificar
              </Button>
              <Button onClick={handleSegment} className="flex-1">
                Segmentar
              </Button>
            </div>
          </Card>
        </div>

        <div className="w-80">
          <Card>
            <CardContent className="p-4 space-y-4">
              <div>
                <h3 className="font-semibold flex items-center gap-2">
                  <Info className="h-4 w-4" /> Resultado da Análise
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {showSegmentation ? "Máscaras (futuro)." : showClassification ? "Classificação concluída." : "Execute uma ação."}
                </p>
                {averageConfidence > 0 && (
                  <p className="text-sm font-medium mt-2">
                    Confiança média: <strong>{averageConfidence}%</strong>
                  </p>
                )}
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full">
                    <Download className="h-4 w-4 mr-2" /> Exportar <ChevronDown className="h-4 w-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-full">
                  <DropdownMenuItem>PDF</DropdownMenuItem>
                  <DropdownMenuItem>PNG</DropdownMenuItem>
                  <DropdownMenuItem>DICOM</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </CardContent>
          </Card>
        </div>
      </main>

      {selectedImage !== null && selectedImg && (
        <div className="fixed inset-0 z-[9999] bg-black/70 flex items-center justify-center p-8" onClick={handleCloseModal}>
          <div
            className="bg-white rounded-xl shadow-2xl w-[min(90vw,90vh)] h-[min(90vw,90vh)] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
              <div>
                {isViewingMask ? (
                  <>
                    <h3 className="font-semibold">Máscara (futuro)</h3>
                    <p className="text-sm text-red-600">Segmentação será integrada depois</p>
                  </>
                ) : (
                  <>
                    <h3 className="font-semibold">Exame {selectedImg.id}</h3>
                    <p className="text-sm text-muted-foreground">
                      Resultado: <strong>{selectedImg.resultado ?? "—"}</strong> • Status: <strong>{selectedImg.status}</strong>
                    </p>
                    <p className="text-sm font-medium">
                      Confiança do modelo: <strong>{selectedImg.confidence}%</strong>
                    </p>
                    {selectedImg.error_message && <p className="text-sm text-destructive">Erro: {selectedImg.error_message}</p>}
                  </>
                )}
              </div>
              <Button size="icon" variant="ghost" onClick={handleCloseModal}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="flex-1 bg-black p-6 flex items-center justify-center overflow-hidden relative">
              <div
                className="w-full h-full flex items-center justify-center cursor-grab active:cursor-grabbing"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onWheel={(e) => {
                  e.preventDefault()
                  if (e.deltaY < 0) handleZoomIn()
                  else handleZoomOut()
                }}
              >
                <img
                  src={selectedImg.url}
                  alt="Zoom"
                  className="max-w-none select-none"
                  style={{
                    transform: `translate(${panX}px, ${panY}px) scale(${imageZoom / 100})`,
                    transformOrigin: "center center",
                    transition: isPanning ? "none" : "transform 0.15s ease-out",
                  }}
                  draggable={false}
                />
              </div>

              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur px-4 py-2 rounded-full flex items-center gap-3 shadow-lg">
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleZoomOut} disabled={imageZoom <= 50}>
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="font-medium text-sm min-w-12 text-center">{imageZoom}%</span>
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleZoomIn} disabled={imageZoom >= 400}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              <div className="absolute top-4 left-4 text-white/80 text-xs bg-black/50 px-3 py-1 rounded-md">
                Role o mouse • Arraste para mover
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}