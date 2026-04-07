"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Upload, X } from "lucide-react"

interface NewPatientModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function NewPatientModal({ isOpen, onClose }: NewPatientModalProps) {
  const [nome, setNome] = useState("")
  const [id, setId] = useState("")
  const [idade, setIdade] = useState("")
  const [sexo, setSexo] = useState("")
  const [uploadedImages, setUploadedImages] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files) {
      const newImages = Array.from(files).map((file) => URL.createObjectURL(file))
      setUploadedImages((prev) => [...prev, ...newImages])
    }
  }

  const removeImage = (index: number) => {
    setUploadedImages((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (uploadedImages.length === 0) {
      alert("Adicione pelo menos uma imagem médica.")
      return
    }

    setIsSubmitting(true)

    // TODO: Aqui você pode integrar com o backend no futuro
    // Exemplo: enviar nome, id, idade, sexo + imagens

    setTimeout(() => {
      setIsSubmitting(false)
      onClose()

      // Resetar formulário
      setNome("")
      setId("")
      setIdade("")
      setSexo("")
      setUploadedImages([])
    }, 800)
  }

  // Limpar ao fechar o modal
  const handleClose = () => {
    onClose()
    setNome("")
    setId("")
    setIdade("")
    setSexo("")
    setUploadedImages([])
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Novo Paciente</DialogTitle>
          <DialogDescription>
            Adicione as informações do paciente e faça upload das imagens médicas
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4 py-2">
            {/* Nome e ID */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome completo</Label>
                <Input
                  id="nome"
                  placeholder="Nome do paciente"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="id">ID do Paciente</Label>
                <Input
                  id="id"
                  placeholder="P001"
                  value={id}
                  onChange={(e) => setId(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Idade e Sexo */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="idade">Idade</Label>
                <Input
                  id="idade"
                  type="number"
                  placeholder="Ex: 42"
                  value={idade}
                  onChange={(e) => setIdade(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sexo">Sexo</Label>
                <Select value={sexo} onValueChange={setSexo} required>
                  <SelectTrigger id="sexo">
                    <SelectValue placeholder="Selecione o sexo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="feminino">Feminino</SelectItem>
                    <SelectItem value="masculino">Masculino</SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Upload de imagens */}
            <div className="space-y-3">
              <Label>Imagens médicas</Label>
              <div className="border-2 border-dashed border-border rounded-xl p-10 text-center hover:border-primary transition-all hover:bg-muted/50">
                <input
                  type="file"
                  id="file-upload"
                  className="hidden"
                  accept=".png,.jpg,.jpeg,.dicom"
                  multiple
                  onChange={handleFileUpload}
                />
                <label htmlFor="file-upload" className="cursor-pointer block">
                  <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="font-medium text-sm mb-1">Clique ou arraste as imagens aqui</p>
                  <p className="text-xs text-muted-foreground">
                    PNG, JPG, JPEG, DICOM • Máximo 10MB por arquivo
                  </p>
                </label>
              </div>

              {/* Preview das imagens */}
              {uploadedImages.length > 0 && (
                <div className="grid grid-cols-4 gap-4 mt-6">
                  {uploadedImages.map((image, index) => (
                    <div key={index} className="relative group rounded-lg overflow-hidden border">
                      <img
                        src={image}
                        alt={`Imagem ${index + 1}`}
                        className="w-full h-28 object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 shadow-md opacity-0 group-hover:opacity-100 transition-all hover:bg-destructive/90"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="gap-3">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={uploadedImages.length === 0 || isSubmitting}
            >
              {isSubmitting ? "Salvando..." : "Salvar Paciente"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}