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
      {/* Navigation Bar - Versão melhorada */}
      <nav className="border-b bg-card sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Activity className="h-7 w-7 text-primary" />
            <span className="text-2xl font-semibold text-primary">EndometrioSys</span>
          </div>

          <Button 
            variant="ghost" 
            onClick={onLogout} 
            className="gap-2 hover:bg-destructive/10 hover:text-destructive transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </Button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-foreground">Pacientes</h1>
            <p className="text-muted-foreground mt-2 text-lg">
              Gerencie e visualize os exames processados de endometriose.
            </p>
          </div>

          <Button onClick={() => setIsModalOpen(true)} className="gap-2 text-base px-6 py-6">
            <Plus className="h-5 w-5" />
            Novo Paciente
          </Button>
        </div>

        {/* Patient Table - Já atualizada anteriormente */}
        <PatientTable
          onViewPrediction={onViewPrediction}
          showPatientNames={showPatientNames}
          setShowPatientNames={setShowPatientNames}
        />
      </main>

      {/* Modal */}
      <NewPatientModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </div>
  )
}