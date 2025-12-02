"use client"

import type React from "react"
import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Activity, ArrowLeft, Download, ChevronDown, Plus, Minus, X, Info } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"

const examImages = [
  { id: 1, url: "/PACIENTE7_IMG-0002-00001.png", aiClassification: "com", mask: "/masks/mask1.png", confidence: 91 },
  { id: 2, url: "/PACIENTE7_IMG-0002-00002.png", aiClassification: "sem", mask: null, confidence: 88 },
  { id: 3, url: "/PACIENTE7_IMG-0002-00003.png", aiClassification: "com", mask: "/masks/mask3.png", confidence: 93 },
  { id: 4, url: "/PACIENTE7_IMG-0002-00004.png", aiClassification: "com", mask: "/masks/mask4.png", confidence: 89 },
  { id: 5, url: "/PACIENTE7_IMG-0002-00005.png", aiClassification: "sem", mask: null, confidence: 95 },
  { id: 6, url: "/PACIENTE7_IMG-0002-00006.png", aiClassification: "com", mask: "/masks/mask6.png", confidence: 90 },
]

export default function PredictionPage({ onBack }: { onBack: () => void }) {
  const [showClassification, setShowClassification] = useState(false)
  const [showSegmentation, setShowSegmentation] = useState(false)
  const [selectedImage, setSelectedImage] = useState<number | null>(null)
  const [isViewingMask, setIsViewingMask] = useState(false) // NOVO: rastreia se é máscara
  const [imageZoom, setImageZoom] = useState(100)
  const [panX, setPanX] = useState(0)
  const [panY, setPanY] = useState(0)
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })

  const [classificationResults, setClassificationResults] = useState<Record<number, "com" | "sem">>({})
  const [classificationValidation, setClassificationValidation] = useState<Record<number, "correct" | "incorrect" | null>>({})

  const initializeClassification = () => {
    const results: Record<number, "com" | "sem"> = {}
    examImages.forEach(img => {
      results[img.id] = img.aiClassification as "com" | "sem"
    })
    setClassificationResults(results)
    setShowClassification(true)
    setShowSegmentation(false)
  }

  const handleClassify = () => {
    if (Object.keys(classificationResults).length === 0) {
      initializeClassification()
    } else {
      setShowClassification(true)
      setShowSegmentation(false)
    }
  }

  const handleSegment = () => {
    const validImages = Object.entries(classificationResults)
      .filter(([id, cls]) => cls === "com" && classificationValidation[Number(id)] === "correct")
      .map(([id]) => Number(id))

    if (validImages.length === 0) {
      alert("Valide pelo menos uma imagem como 'Com Endometriose' e 'Correto'.")
      return
    }

    setShowSegmentation(true)
    setShowClassification(false)
  }

  // NOVO: clique com tipo
  const handleImageClick = (id: number, isMask = false) => {
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

  const handleZoomIn = () => setImageZoom(prev => Math.min(prev + 25, 400))
  const handleZoomOut = () => setImageZoom(prev => Math.max(prev - 25, 50))

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

  const handleValidation = (id: number, value: "correct" | "incorrect") => {
    setClassificationValidation(prev => ({
      ...prev,
      [id]: prev[id] === value ? null : value
    }))
  }

  const semImages = examImages.filter(img => classificationResults[img.id] === "sem")
  const comImages = examImages.filter(img => classificationResults[img.id] === "com")
  const selectedImg = examImages.find(img => img.id === selectedImage)
  const segmentedImages = examImages.filter(img => 
    img.mask && classificationResults[img.id] === "com" && classificationValidation[img.id] === "correct"
  )

  // Confiança média (sempre visível após classificação)
  const averageConfidence = useMemo(() => {
    const classified = Object.keys(classificationResults).length
    if (classified === 0) return 0
    const sum = examImages.reduce((acc, img) => acc + img.confidence, 0)
    return Math.round(sum / examImages.length)
  }, [classificationResults])

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <nav className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Button>
          <div className="flex items-center gap-2 text-primary">
            <Activity className="h-6 w-6" />
            <span className="text-xl font-semibold">EndometrioseSys</span>
          </div>
        </div>
      </nav>

      <main className="flex-1 container mx-auto px-4 py-6 flex gap-6">
        {/* COLUNA ESQUERDA: IMAGENS */}
        <div className="flex-1 flex flex-col">
          <div className="mb-4">
            <h1 className="text-2xl font-semibold">Análise de Exame</h1>
            <p className="text-sm text-muted-foreground">
              Nome: Maria Silva • ID: P001 • Data: 15/10/2025
            </p>
          </div>

          <Card className="flex-1 flex flex-col overflow-hidden">
            <CardContent className="flex-1 overflow-auto p-6">
              {/* Inicial */}
              {!showClassification && !showSegmentation && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {examImages.map(img => (
                    <Card key={img.id} className="cursor-pointer hover:ring-2 ring-primary transition-all" onClick={() => handleImageClick(img.id, false)}>
                      <img src={img.url} alt="" className="w-full h-auto rounded-md" />
                    </Card>
                  ))}
                </div>
              )}

              {/* Classificação */}
              {showClassification && !showSegmentation && (
                <div className="space-y-8">
                  <div className="bg-gray-100 p-5 rounded-lg">
                    <h3 className="font-semibold mb-3 text-green-700">Sem Endometriose</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {semImages.map(img => (
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
                    </div>
                  </div>

                  <div className="bg-red-50 p-5 rounded-lg">
                    <h3 className="font-semibold mb-3 text-red-700">Com Endometriose</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {comImages.map(img => (
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
                    </div>
                  </div>
                </div>
              )}

              {/* Segmentação */}
              {showSegmentation && (
                <div className="bg-muted p-6 rounded-lg">
                  <h3 className="font-semibold mb-3">Máscaras Ilustrativas</h3>
                  <p className="text-sm text-muted-foreground mb-4">Branco = Endometriose (simulação)</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {segmentedImages.map(img => (
                      <div key={img.id} className="flex gap-2">
                        {/* Imagem original */}
                        <Card className="flex-1 cursor-pointer hover:ring-2 ring-primary" onClick={() => handleImageClick(img.id, false)}>
                          <img src={img.url} alt="Original" className="w-full h-auto rounded-md" />
                          <p className="text-xs text-center bg-white/80 mt-1">Original</p>
                        </Card>
                        {/* Máscara */}
                        <Card className="flex-1 cursor-pointer hover:ring-2 ring-primary" onClick={() => handleImageClick(img.id, true)}>
                          <img src={img.mask!} alt="Máscara" className="w-full h-auto bg-black rounded-md" />
                          <p className="text-xs text-center bg-white/80 mt-1">Máscara</p>
                        </Card>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>

            <div className="p-4 border-t flex gap-3">
              <Button onClick={handleClassify} className="flex-1" variant={showClassification ? "default" : "outline"}>
                Classificar
              </Button>
              <Button onClick={handleSegment} className="flex-1" disabled={!showClassification}>
                Segmentar
              </Button>
            </div>
          </Card>
        </div>

        {/* SIDEBAR COM CONFIANÇA MÉDIA */}
        <div className="w-80">
          <Card>
            <CardContent className="p-4 space-y-4">
              <div>
                <h3 className="font-semibold flex items-center gap-2">
                  <Info className="h-4 w-4" /> Resultado da Análise
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {showSegmentation ? "Máscaras geradas." : showClassification ? "Classificação concluída." : "Execute uma ação."}
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

      {/* POPUP COM INFO + ZOOM */}
      {selectedImage !== null && selectedImg && (
        <div className="fixed inset-0 z-[9999] bg-black/70 flex items-center justify-center p-8" onClick={handleCloseModal}>
          <div
            className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            {/* Header com info */}
            <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
              <div>
                {isViewingMask ? (
                  <>
                    <h3 className="font-semibold">Máscara da Imagem {selectedImg.id}</h3>
                    <p className="text-sm text-red-600">Endometriose segmentada (simulação)</p>
                  </>
                ) : (
                  <>
                    <h3 className="font-semibold">Imagem {selectedImg.id}</h3>
                    <p className="text-sm text-muted-foreground">
                      Classificação IA: <strong className={selectedImg.aiClassification === "com" ? "text-red-600" : "text-green-600"}>
                        {selectedImg.aiClassification === "com" ? "Com Endometriose" : "Sem Endometriose"}
                      </strong>
                    </p>
                    <p className="text-sm font-medium">Confiança do modelo: <strong>{selectedImg.confidence}%</strong></p>
                  </>
                )}
              </div>
              <Button size="icon" variant="ghost" onClick={handleCloseModal}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Zoom */}
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
                  src={isViewingMask ? selectedImg.mask! : selectedImg.url}
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

              {/* Controles de zoom */}
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
