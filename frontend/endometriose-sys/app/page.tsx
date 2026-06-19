"use client"

import { useState } from "react"
import SignUpPage from "@/components/sign-up-page"
import LoginPage from "@/components/login-page"
import DashboardPage from "@/components/dashboard-page"
import PredictionPage from "@/components/prediction-page"

export type ManualCorrectionType =
  | "partial-adjustment"
  | "redo-segmentation"
  | "no-segmentation"

export type ManualMarkingImage = {
  id: string
  url: string
  overlayUrl: string | null
  patientId: string
  correctionType: ManualCorrectionType
  hasInitialMask: boolean
}

export default function Home() {
  const [currentPage, setCurrentPage] = useState<
    "signup" | "login" | "dashboard" | "prediction"
  >("login")

  const [selectedPatient, setSelectedPatient] = useState<string | null>(null)

  const [manualMarkingQueue, setManualMarkingQueue] = useState<
    ManualMarkingImage[]
  >([])

  const handleSignUp = () => setCurrentPage("login")

  const handleLogin = () => setCurrentPage("dashboard")

  const handleLogout = () => {
    setCurrentPage("login")
    setSelectedPatient(null)
    setManualMarkingQueue([])
  }

  const handleViewPrediction = (patientId: string) => {
    setSelectedPatient(patientId)
    setCurrentPage("prediction")
  }

  const handleBackToDashboard = () => {
    setCurrentPage("dashboard")
  }

  const handleNavigateToSignUp = () => setCurrentPage("signup")

  const handleNavigateToLogin = () => setCurrentPage("login")

  const handleSaveIncorrectSegmentations = (images: ManualMarkingImage[]) => {
    setManualMarkingQueue((prev) => {
      const merged = [...prev]

      images.forEach((image) => {
        const alreadyExists = merged.some(
          (item) =>
            item.id === image.id &&
            item.patientId === image.patientId &&
            item.correctionType === image.correctionType
        )

        if (!alreadyExists) {
          merged.push(image)
        }
      })

      return merged
    })
  }

  return (
    <>
      {currentPage === "signup" && (
        <SignUpPage
          onSignUp={handleSignUp}
          onNavigateToLogin={handleNavigateToLogin}
        />
      )}

      {currentPage === "login" && (
        <LoginPage
          onLogin={handleLogin}
          onNavigateToSignUp={handleNavigateToSignUp}
        />
      )}

      {currentPage === "dashboard" && (
        <DashboardPage
          onLogout={handleLogout}
          onViewPrediction={handleViewPrediction}
          manualMarkingQueue={manualMarkingQueue}
        />
      )}

      {currentPage === "prediction" && selectedPatient && (
        <PredictionPage
          onBack={handleBackToDashboard}
          patientId={selectedPatient}
          onSaveIncorrectSegmentations={handleSaveIncorrectSegmentations}
        />
      )}

      {currentPage === "prediction" && !selectedPatient && (
        <DashboardPage
          onLogout={handleLogout}
          onViewPrediction={handleViewPrediction}
          manualMarkingQueue={manualMarkingQueue}
        />
      )}
    </>
  )
}