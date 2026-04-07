"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Activity } from "lucide-react"

interface SignUpPageProps {
  onSignUp: () => void
  onNavigateToLogin: () => void
}

export default function SignUpPage({ onSignUp, onNavigateToLogin }: SignUpPageProps) {
  const [name, setName] = useState("")
  const [crm, setCrm] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Validações
    if (password !== confirmPassword) {
      alert("As senhas não coincidem!")
      return
    }

    if (password.length < 6) {
      alert("A senha deve ter pelo menos 6 caracteres.")
      return
    }

    if (!crm.trim()) {
      alert("O campo CRM é obrigatório.")
      return
    }

    setIsLoading(true)

    // Simulação de cadastro (você pode substituir depois pela chamada real para o backend)
    setTimeout(() => {
      setIsLoading(false)
      onSignUp()
    }, 800)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-4 text-center">
          <div className="flex justify-center">
            <div className="flex items-center gap-2 text-primary">
              <Activity className="h-8 w-8" />
              <span className="text-2xl font-semibold">EndometrioSys</span>
            </div>
          </div>
          <CardTitle className="text-3xl">Cadastrar Médico</CardTitle>
          <CardDescription>Crie sua conta para acessar o sistema</CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Nome completo */}
            <div className="space-y-2">
              <Label htmlFor="name">Nome completo</Label>
              <Input
                id="name"
                type="text"
                placeholder="Dr. João Silva"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            {/* CRM */}
            <div className="space-y-2">
              <Label htmlFor="crm">CRM</Label>
              <Input
                id="crm"
                type="text"
                placeholder="12345/RJ"
                value={crm}
                onChange={(e) => setCrm(e.target.value)}
                required
              />
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            {/* Senha */}
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {/* Confirmar senha */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar senha</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            {/* Botão de cadastro */}
            <Button 
              type="submit" 
              className="w-full bg-primary hover:bg-primary/90" 
              disabled={isLoading}
            >
              {isLoading ? "Cadastrando..." : "Criar conta"}
            </Button>

            {/* Link para login */}
            <div className="text-center text-sm">
              <button
                type="button"
                onClick={onNavigateToLogin}
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                Já tem uma conta? <span className="font-medium">Entrar</span>
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}