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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Upload, X } from "lucide-react"

interface NewPatientModalProps {
  isOpen: boolean
  onClose: () => void
  onPatientCreated?: () => void
}

export default function NewPatientModal({
  isOpen,
  onClose,
  onPatientCreated,
}: NewPatientModalProps) {
  const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

  const [nome, setNome] = useState("")
  const [id, setId] = useState("")
  const [idade, setIdade] = useState("")
  const [sexo, setSexo] = useState("")
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [uploadedPreviews, setUploadedPreviews] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  const resetForm = () => {
    uploadedPreviews.forEach((url) => URL.revokeObjectURL(url))

    setNome("")
    setId("")
    setIdade("")
    setSexo("")
    setUploadedFiles([])
    setUploadedPreviews([])
    setIsSubmitting(false)
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ""

    if (files.length === 0) return

    const validFiles = files.filter((file) => {
      const name = file.name.toLowerCase()
      return (
        name.endsWith(".png") ||
        name.endsWith(".jpg") ||
        name.endsWith(".jpeg") ||
        name.endsWith(".webp")
      )
    })

    if (validFiles.length !== files.length) {
      alert("Alguns arquivos foram ignorados. Use apenas PNG, JPG, JPEG ou WEBP.")
    }

    const previews = validFiles.map((file) => URL.createObjectURL(file))

    setUploadedFiles((prev) => [...prev, ...validFiles])
    setUploadedPreviews((prev) => [...prev, ...previews])
  }

  const removeImage = (index: number) => {
    URL.revokeObjectURL(uploadedPreviews[index])

    setUploadedFiles((prev) => prev.filter((_, i) => i !== index))
    setUploadedPreviews((prev) => prev.filter((_, i) => i !== index))
  }

  const sexoToSexoId = (value: string) => {
    if (value === "feminino") return 1
    if (value === "masculino") return 2
    if (value === "outro") return 3
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!id.trim()) {
      alert("Informe o ID do paciente.")
      return
    }

    if (!nome.trim()) {
      alert("Informe o nome do paciente.")
      return
    }

    setIsSubmitting(true)

    try {
      const createPatientResponse = await fetch(`${API}/api/pacientes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: id.trim(),
          nome: nome.trim(),
          idade: idade ? Number(idade) : null,
          sexo_id: sexoToSexoId(sexo),
          usuario_id: null,
        }),
      })

      const createPatientPayload = await createPatientResponse
        .json()
        .catch(() => ({}))

      if (!createPatientResponse.ok) {
        throw new Error(
          createPatientPayload?.erro ??
            createPatientPayload?.error ??
            `Falha ao salvar paciente (${createPatientResponse.status})`
        )
      }

      for (const file of uploadedFiles) {
        const formData = new FormData()
        formData.append("paciente_id", id.trim())
        formData.append("file", file)

        const uploadResponse = await fetch(`${API}/api/exames/upload`, {
          method: "POST",
          body: formData,
        })

        const uploadPayload = await uploadResponse.json().catch(() => ({}))

        if (!uploadResponse.ok) {
          throw new Error(
            uploadPayload?.erro ??
              uploadPayload?.error ??
              `Paciente criado, mas falhou o upload de um exame (${uploadResponse.status})`
          )
        }
      }

      onPatientCreated?.()
      onClose()
      resetForm()
    } catch (err: any) {
      alert(err?.message ?? "Erro ao salvar paciente")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (isSubmitting) return

    onClose()
    resetForm()
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Novo Paciente</DialogTitle>
          <DialogDescription>
            Adicione as informações do paciente e faça upload das imagens médicas.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome completo</Label>
                <Input
                  id="nome"
                  placeholder="Nome do paciente"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  required
                  disabled={isSubmitting}
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
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="idade">Idade</Label>
                <Input
                  id="idade"
                  type="number"
                  placeholder="Ex: 42"
                  value={idade}
                  onChange={(e) => setIdade(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sexo">Sexo</Label>
                <Select
                  value={sexo}
                  onValueChange={setSexo}
                  disabled={isSubmitting}
                >
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

            <div className="space-y-3">
              <Label>Imagens médicas</Label>

              <div className="border-2 border-dashed border-border rounded-xl p-10 text-center hover:border-primary transition-all hover:bg-muted/50">
                <input
                  type="file"
                  id="file-upload"
                  className="hidden"
                  accept=".png,.jpg,.jpeg,.webp"
                  multiple
                  onChange={handleFileUpload}
                  disabled={isSubmitting}
                />

                <label htmlFor="file-upload" className="cursor-pointer block">
                  <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />

                  <p className="font-medium text-sm mb-1">
                    Clique ou arraste as imagens aqui
                  </p>

                  <p className="text-xs text-muted-foreground">
                    PNG, JPG, JPEG, WEBP • Máximo 10MB por arquivo
                  </p>
                </label>
              </div>

              {uploadedPreviews.length > 0 && (
                <div className="grid grid-cols-4 gap-4 mt-6">
                  {uploadedPreviews.map((image, index) => (
                    <div
                      key={`${image}-${index}`}
                      className="relative group rounded-lg overflow-hidden border"
                    >
                      <img
                        src={image}
                        alt={`Imagem ${index + 1}`}
                        className="w-full h-28 object-cover"
                      />

                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 shadow-md opacity-0 group-hover:opacity-100 transition-all hover:bg-destructive/90"
                        disabled={isSubmitting}
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
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>

            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Salvando..." : "Salvar Paciente"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}