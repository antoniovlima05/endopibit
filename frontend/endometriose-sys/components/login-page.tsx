"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Activity } from "lucide-react"

interface LoginPageProps {
  onLogin: () => void
  onNavigateToSignUp: () => void
}

export default function LoginPage({ onLogin, onNavigateToSignUp }: LoginPageProps) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!email.trim() || !password.trim()) {
      alert("Por favor, preencha todos os campos.")
      return
    }

    setIsLoading(true)

    // Simulação de login (substitua depois pela chamada real para o backend)
    setTimeout(() => {
      setIsLoading(false)
      onLogin()
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
          <CardTitle className="text-3xl">Bem-vindo</CardTitle>
          <CardDescription>Sistema de apoio à decisão clínica para detecção de endometriose.</CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email ou usuário</Label>
              <Input
                id="email"
                type="text"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

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

            {/* Botão de login com loading */}
            <Button 
              type="submit" 
              className="w-full bg-primary hover:bg-primary/90" 
              disabled={isLoading}
            >
              {isLoading ? "Entrando..." : "Entrar"}
            </Button>

            {/* Link para cadastro */}
            <div className="text-center text-sm">
              <button
                type="button"
                onClick={onNavigateToSignUp}
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                Não tem conta? <span className="font-medium">Cadastrar</span>
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}