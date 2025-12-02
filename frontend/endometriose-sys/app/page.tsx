"use client"

import { useState } from "react"
import SignUpPage from "@/components/sign-up-page"
import LoginPage from "@/components/login-page"
import DashboardPage from "@/components/dashboard-page"
import PredictionPage from "@/components/prediction-page"

export default function Home() {
  const [currentPage, setCurrentPage] = useState<"signup" | "login" | "dashboard" | "prediction">("login")
  const [selectedPatient, setSelectedPatient] = useState<string | null>(null)

  const handleSignUp = () => {
    setCurrentPage("login")
  }

  const handleLogin = () => {
    setCurrentPage("dashboard")
  }

  const handleLogout = () => {
    setCurrentPage("login")
    setSelectedPatient(null)
  }

  const handleViewPrediction = (patientId: string) => {
    setSelectedPatient(patientId)
    setCurrentPage("prediction")
  }

  const handleBackToDashboard = () => {
    setCurrentPage("dashboard")
    setSelectedPatient(null)
  }

  const handleNavigateToSignUp = () => {
    setCurrentPage("signup")
  }

  const handleNavigateToLogin = () => {
    setCurrentPage("login")
  }

  return (
    <>
      {currentPage === "signup" && <SignUpPage onSignUp={handleSignUp} onNavigateToLogin={handleNavigateToLogin} />}
      {currentPage === "login" && <LoginPage onLogin={handleLogin} onNavigateToSignUp={handleNavigateToSignUp} />}
      {currentPage === "dashboard" && <DashboardPage onLogout={handleLogout} onViewPrediction={handleViewPrediction} />}
      {currentPage === "prediction" && (
        <PredictionPage onBack={handleBackToDashboard} onNewPrediction={handleBackToDashboard} />
      )}
    </>
  )
}
