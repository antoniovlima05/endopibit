"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { FileSearch, Trash2, ChevronDown, Eye, EyeOff, Upload } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"

interface PatientTableProps {
  onViewPrediction: (patientId: string) => void
  showPatientNames: boolean
  setShowPatientNames: (value: boolean) => void
}

type Exam = {
  examId: string
  data: string
  status: string
}

type Patient = {
  id: string
  nome: string
  exams: Exam[]
}

function normalizePatients(payload: any): Patient[] {
  if (Array.isArray(payload) && payload.length && payload[0]?.exams) return payload as Patient[]
  if (!Array.isArray(payload)) return []

  return payload.map((p: any) => {
    const id = String(p.id ?? p.patientId ?? p.codigo ?? "")
    const nome = String(p.nome ?? p.name ?? p.paciente ?? "Paciente")

    const rawExams = Array.isArray(p.exams) ? p.exams : Array.isArray(p.exames) ? p.exames : []
    const exams: Exam[] = rawExams.map((e: any, idx: number) => ({
      examId: String(e.examId ?? e.id ?? e.exam_id ?? `E${String(idx + 1).padStart(3, "0")}`),
      data: String(e.data ?? e.date ?? e.createdAt ?? "—"),
      status: String(e.statusLabel ?? e.status ?? e.estado ?? "—"),
    }))

    if (exams.length === 0) {
      exams.push({ examId: "—", data: "—", status: "—" })
    }

    return { id, nome, exams }
  })
}

export default function PatientTable({ onViewPrediction, showPatientNames, setShowPatientNames }: PatientTableProps) {
  const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

  const [searchTerm, setSearchTerm] = useState("")
  const [expandedPatients, setExpandedPatients] = useState<Set<string>>(new Set())

  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Upload state
  const [uploadingFor, setUploadingFor] = useState<string | null>(null)
  const pendingPatientIdRef = useRef<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const toggleExpanded = (patientId: string) => {
    setExpandedPatients((prev) => {
      const next = new Set(prev)
      next.has(patientId) ? next.delete(patientId) : next.add(patientId)
      return next
    })
  }

  const getStatusVariant = (status: string) => {
    if (status === "Concluído") return "default"
    if (status === "Falhou") return "destructive" as any
    return "secondary"
  }

  const loadPatients = async () => {
    setLoading(true)
    setErrorMsg(null)
    try {
      const res = await fetch(`${API}/api/pacientes`, { cache: "no-store" })
      if (!res.ok) throw new Error(`Falha ao buscar pacientes (${res.status})`)
      const data = await res.json()
      setPatients(normalizePatients(data))
    } catch (err: any) {
      setErrorMsg(err?.message ?? "Erro ao carregar pacientes")
      setPatients([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPatients()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filteredPatients = useMemo(() => {
    const searchLower = searchTerm.toLowerCase()
    return patients.filter((patient) => {
      return patient.nome.toLowerCase().includes(searchLower) || patient.id.toLowerCase().includes(searchLower)
    })
  }, [patients, searchTerm])

  const handleDeletePatient = async (patientId: string) => {
    const ok = window.confirm(`Deseja realmente excluir o paciente ${patientId}?`)
    if (!ok) return

    try {
      const res = await fetch(`${API}/api/pacientes/${encodeURIComponent(patientId)}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error(`Falha ao excluir (${res.status})`)
      setPatients((prev) => prev.filter((p) => p.id !== patientId))
      setExpandedPatients((prev) => {
        const next = new Set(prev)
        next.delete(patientId)
        return next
      })
    } catch (err: any) {
      alert(err?.message ?? "Erro ao excluir paciente")
    }
  }

  // 1) Clique no botão "Analisar" abre seletor de arquivo
  const startUploadForPatient = (patientId: string) => {
    pendingPatientIdRef.current = patientId
    fileInputRef.current?.click()
  }

  // 2) Ao selecionar o arquivo, faz upload real para o backend
  const onFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    const patientId = pendingPatientIdRef.current

    // limpa o input para permitir escolher o mesmo arquivo de novo depois
    e.target.value = ""

    if (!file || !patientId) return

    setUploadingFor(patientId)
    setErrorMsg(null)

    try {
      const fd = new FormData()
      fd.append("paciente_id", patientId)
      fd.append("file", file)

      const res = await fetch(`${API}/api/exames/upload`, {
        method: "POST",
        body: fd,
      })

      const payload = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(payload?.erro ?? `Falha no upload (${res.status})`)
      }

      // Atualiza a lista para refletir novo exame/status
      await loadPatients()

      // Abre a tela de análise do paciente
      onViewPrediction(patientId)

    } catch (err: any) {
      alert(err?.message ?? "Erro ao enviar exame")
    } finally {
      setUploadingFor(null)
      pendingPatientIdRef.current = null
    }
  }

  return (
    <div className="space-y-4">
      {/* input invisível para upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".png,.jpg,.jpeg,.webp"
        className="hidden"
        onChange={onFileSelected}
      />

      {/* Busca + ações */}
      <div className="flex gap-2 items-center">
        <Input
          placeholder="Buscar por nome ou ID..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />

        <Button
          variant="outline"
          size="sm"
          onClick={loadPatients}
          disabled={loading}
          className="ml-auto"
          title="Recarregar pacientes"
        >
          {loading ? "Carregando..." : "Recarregar"}
        </Button>
      </div>

      {errorMsg && (
        <div className="text-sm text-destructive">
          {errorMsg} — verifique se o backend está rodando em {API}.
        </div>
      )}

      {/* Tabela */}
      <Card className="shadow-sm overflow-hidden">
        <Table className="w-full border-collapse">
          <TableHeader>
            <TableRow className="border-b">
              <TableHead className="w-12"></TableHead>

              <TableHead className="w-1/4 px-4">
                <div className="flex items-center gap-2">
                  <span>Nome</span>
                  <button
                    onClick={() => setShowPatientNames(!showPatientNames)}
                    title={showPatientNames ? "Ocultar nomes" : "Mostrar nomes"}
                    className="text-muted-foreground hover:text-primary transition"
                  >
                    {showPatientNames ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </button>
                </div>
              </TableHead>

              <TableHead className="w-1/6 px-4">ID</TableHead>
              <TableHead className="w-1/6 px-4">Data</TableHead>
              <TableHead className="w-1/6 px-4">Status</TableHead>
              <TableHead className="w-1/4 px-4 text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {filteredPatients.map((patient) => (
              <tbody key={patient.id}>
                {/* Linha principal */}
                <TableRow className="border-b">
                  <TableCell className="w-12">
                    {patient.exams.length > 1 && (
                      <button
                        onClick={() => toggleExpanded(patient.id)}
                        className="p-1 hover:bg-muted rounded transition-colors"
                      >
                        <ChevronDown
                          className={`h-4 w-4 transition-transform ${expandedPatients.has(patient.id) ? "rotate-180" : ""}`}
                        />
                      </button>
                    )}
                  </TableCell>

                  <TableCell className="font-medium px-4">{showPatientNames ? patient.nome : "••••••••"}</TableCell>
                  <TableCell className="text-muted-foreground px-4">{patient.id}</TableCell>
                  <TableCell className="text-muted-foreground px-4">{patient.exams[0]?.data}</TableCell>

                  <TableCell className="px-4">
                    <Badge variant={getStatusVariant(patient.exams[0]?.status)}>{patient.exams[0]?.status}</Badge>
                  </TableCell>

                  <TableCell className="text-right px-4">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => startUploadForPatient(patient.id)}
                        className="gap-2"
                        disabled={uploadingFor === patient.id}
                        title="Enviar exame e analisar"
                      >
                        {uploadingFor === patient.id ? (
                          <>
                            <Upload className="h-4 w-4 animate-pulse" />
                            Enviando...
                          </>
                        ) : (
                          <>
                            <FileSearch className="h-4 w-4" />
                            Analisar
                          </>
                        )}
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeletePatient(patient.id)}
                        className="gap-2 text-destructive hover:text-destructive"
                        disabled={uploadingFor === patient.id}
                      >
                        <Trash2 className="h-4 w-4" />
                        Excluir
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>

                {/* Exames adicionais */}
                {expandedPatients.has(patient.id) &&
                  patient.exams.slice(1).map((exam) => (
                    <TableRow key={exam.examId} className="bg-muted/30 border-b">
                      <TableCell></TableCell>
                      <TableCell className="italic text-muted-foreground px-8">Exame adicional</TableCell>
                      <TableCell className="text-muted-foreground px-4">{exam.examId}</TableCell>
                      <TableCell className="text-muted-foreground px-4">{exam.data}</TableCell>
                      <TableCell className="px-4">
                        <Badge variant={getStatusVariant(exam.status)}>{exam.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right px-4"></TableCell>
                    </TableRow>
                  ))}
              </tbody>
            ))}

            {!loading && filteredPatients.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  Nenhum paciente encontrado.
                </TableCell>
              </TableRow>
            )}

            {loading && (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  Carregando pacientes...
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}