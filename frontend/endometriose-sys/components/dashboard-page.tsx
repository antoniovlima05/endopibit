"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Activity, LogOut, Plus } from "lucide-react"
import PatientTable from "@/components/patient-table"
import NewPatientModal from "@/components/new-patient-modal"

interface DashboardPageProps {
  onLogout: () => void
  onViewPrediction: (patientId: string) => void
}

export default function DashboardPage({ onLogout, onViewPrediction }: DashboardPageProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [showPatientNames, setShowPatientNames] = useState(true)

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation Bar */}
      <nav className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-primary">
            <Activity className="h-6 w-6" />
            <span className="text-xl font-semibold">EndometrioseSys</span>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={onLogout} className="gap-2">
              <LogOut className="h-4 w-4" />
              Sair
            </Button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-semibold text-foreground mb-2">Pacientes</h1>
            <p className="text-muted-foreground">Gerencie e visualize os exames processados.</p>
          </div>

          <Button onClick={() => setIsModalOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Novo Paciente
          </Button>
        </div>

        <PatientTable
          onViewPrediction={onViewPrediction}
          showPatientNames={showPatientNames}
          setShowPatientNames={setShowPatientNames}
        />
      </main>

      <NewPatientModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  )
}
