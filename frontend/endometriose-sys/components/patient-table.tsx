"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { FileSearch, Trash2, ChevronDown, Eye, EyeOff } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"

interface PatientTableProps {
  onViewPrediction: (patientId: string) => void
  showPatientNames: boolean
  setShowPatientNames: (value: boolean) => void
}

const mockPatients = [
  {
    id: "P001",
    nome: "Maria Silva",
    exams: [
      { examId: "E001", data: "15/10/2025", status: "Concluído" },
      { examId: "E002", data: "10/10/2025", status: "Concluído" },
    ],
  },
  {
    id: "P002",
    nome: "Ana Santos",
    exams: [{ examId: "E003", data: "14/10/2025", status: "Concluído" }],
  },
  {
    id: "P003",
    nome: "Juliana Costa",
    exams: [{ examId: "E004", data: "13/10/2025", status: "Processando" }],
  },
  {
    id: "P004",
    nome: "Carla Oliveira",
    exams: [{ examId: "E005", data: "12/10/2025", status: "Concluído" }],
  },
  {
    id: "P005",
    nome: "Beatriz Lima",
    exams: [{ examId: "E006", data: "11/10/2025", status: "Concluído" }],
  },
]

export default function PatientTable({ onViewPrediction, showPatientNames, setShowPatientNames }: PatientTableProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [expandedPatients, setExpandedPatients] = useState<Set<string>>(new Set())

  const toggleExpanded = (patientId: string) => {
    const newExpanded = new Set(expandedPatients)
    newExpanded.has(patientId) ? newExpanded.delete(patientId) : newExpanded.add(patientId)
    setExpandedPatients(newExpanded)
  }

  const filteredPatients = mockPatients.filter((patient) => {
    const searchLower = searchTerm.toLowerCase()
    return patient.nome.toLowerCase().includes(searchLower) || patient.id.toLowerCase().includes(searchLower)
  })

  const getStatusVariant = (status: string) => (status === "Concluído" ? "default" : "secondary")

  return (
    <div className="space-y-4">
      {/* Campo de busca */}
      <div className="flex gap-2">
        <Input
          placeholder="Buscar por nome ou ID..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
      </div>

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
                    {showPatientNames ? (
                      <Eye className="h-4 w-4" />
                    ) : (
                      <EyeOff className="h-4 w-4" />
                    )}
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
              <>
                {/* Linha principal */}
                <TableRow key={patient.id} className="border-b">
                  <TableCell className="w-12">
                    {patient.exams.length > 1 && (
                      <button
                        onClick={() => toggleExpanded(patient.id)}
                        className="p-1 hover:bg-muted rounded transition-colors"
                      >
                        <ChevronDown
                          className={`h-4 w-4 transition-transform ${
                            expandedPatients.has(patient.id) ? "rotate-180" : ""
                          }`}
                        />
                      </button>
                    )}
                  </TableCell>

                  <TableCell className="font-medium px-4">
                    {showPatientNames ? patient.nome : "••••••••"}
                  </TableCell>

                  <TableCell className="text-muted-foreground px-4">{patient.id}</TableCell>
                  <TableCell className="text-muted-foreground px-4">{patient.exams[0]?.data}</TableCell>
                  <TableCell className="px-4">
                    <Badge variant={getStatusVariant(patient.exams[0]?.status)}>{patient.exams[0]?.status}</Badge>
                  </TableCell>

                  <TableCell className="text-right px-4">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => onViewPrediction(patient.id)} className="gap-2">
                        <FileSearch className="h-4 w-4" />
                        Analisar
                      </Button>
                      <Button variant="ghost" size="sm" className="gap-2 text-destructive hover:text-destructive">
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
                      <TableCell className="text-right px-4">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onViewPrediction(exam.examId)}
                            className="gap-2"
                          >
                            <FileSearch className="h-4 w-4" />
                            Analisar
                          </Button>
                          <Button variant="ghost" size="sm" className="gap-2 text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                            Excluir
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
              </>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}
