"use client"

import Image from "next/image"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm } from "react-hook-form"
import * as z from "zod"
import {
  Field,
  FieldError,
  FieldGroup,
} from "@/components/ui/field"
import { Button } from "@/components/ui/button"
import { Mail, Lock, ArrowRight, LayoutDashboard, Users, Ticket, Shield } from "lucide-react"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import { authClient } from "./utils/auth-client"
import { toast } from "react-toastify"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "Senha obrigatória")
})

export default function Home() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: ""
    }
  })

  useEffect(() => {
    authClient.getSession().then((res) => {
      if (res.data?.session) {
        router.replace("/dashboard")
      }
    })
  }, [router])

  function onSubmit(data: z.infer<typeof loginSchema>) {
    setIsLoading(true)
    const loginPromise = authClient.signIn.email({
      email: data.email,
      password: data.password,
    }).then((res) => {
      if (res.error) {
        throw new Error(res.error.message || "Credenciais inválidas")
      }
      router.replace("/dashboard")
      return res
    }).finally(() => setIsLoading(false))

    toast.promise(loginPromise, {
      pending: {
        render() {
          return "Autenticando..."
        },
      },
      success: {
        render() {
          return "Login realizado com sucesso!"
        },
      },
      error: {
        render() {
          return "Email ou Senha Invalidos"
        },
      },
    })
  }

  return (
    <div className="min-h-screen flex">

      {/* ── Left Panel: Branding ── */}
      <div className="hidden lg:flex w-130 shrink-0 bg-blue-600 flex-col justify-between p-12 relative overflow-hidden">
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23fff' fill-opacity='1'%3E%3Cpath d='M0 0h1v40H0zM40 0h1v40h-1zM0 0h40v1H0zM0 40h40v1H0z'/%3E%3C/g%3E%3C/svg%3E\")" }} />
        {/* Glow */}
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-blue-400/20 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-blue-700/30 blur-3xl" />

        {/* Top: Logo */}
        <div className="relative z-10">
          <div className="relative w-32 h-20">
            <Image
              src="/root/logo.png"
              alt="Logo"
              fill
              className="object-contain brightness-0 invert"
            />
          </div>
        </div>

        {/* Center: Text */}
        <div className="relative z-10">
          <h1 className="text-4xl font-bold text-white leading-tight mb-4">
            MV Gestão
          </h1>
          <p className="text-blue-100/60 text-sm leading-relaxed max-w-xs mb-10">
            Sistema interno de gestão — acesse com suas credenciais corporativas.
          </p>

          {/* Modules */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: Users, label: "Clientes", desc: "Base de clientes" },
              { icon: Ticket, label: "Tickets", desc: "Suporte e chamados" },
              { icon: LayoutDashboard, label: "Dashboard", desc: "Visão geral" },
              { icon: Shield, label: "Acesso", desc: "Controle seguro" },
            ].map((f) => (
              <div key={f.label} className="bg-white/8 backdrop-blur-sm rounded-xl p-3.5">
                <f.icon size={16} className="text-white/70 mb-2" />
                <p className="text-xs font-semibold text-white">{f.label}</p>
                <p className="text-[10px] text-blue-100/40 mt-0.5">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom */}
        <div className="relative z-10">
          <p className="text-blue-200/25 text-[10px]">
            Uso interno — acesso restrito a colaboradores autorizados
          </p>
        </div>
      </div>

      {/* ── Right Panel: Login Form ── */}
      <div className="flex-1 flex items-center justify-center p-6 bg-gray-50">
        <div className="w-full max-w-sm">

          {/* Mobile logo */}
          <div className="lg:hidden flex justify-center mb-8">
            <div className="relative w-40 h-28">
              <Image src="/root/logo.png" alt="Logo" fill className="object-contain" />
            </div>
          </div>

          {/* Heading */}
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-900">Acessar o sistema</h2>
            <p className="text-sm text-gray-400 mt-1">Entre com seu email e senha corporativos.</p>
          </div>

          {/* Form */}
          <form id="login-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FieldGroup>
              <Controller
                name="email"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <label htmlFor="email" className="text-xs font-medium text-gray-500 mb-1.5 block">Email</label>
                    <InputGroup className="bg-white h-11 rounded-xl border border-gray-200 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-600/10 transition-all">
                      <InputGroupAddon align="inline-start">
                        <Mail size={16} className="text-gray-300" />
                      </InputGroupAddon>
                      <InputGroupInput
                        {...field}
                        id="email"
                        aria-invalid={fieldState.invalid}
                        placeholder="seu@empresa.com.br"
                        autoComplete="off"
                        type="email"
                        className="text-sm"
                      />
                    </InputGroup>
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
              <Controller
                name="password"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <div className="flex items-center justify-between mb-1.5">
                      <label htmlFor="password" className="text-xs font-medium text-gray-500">Senha</label>
                      <button type="button" className="text-[10px] text-blue-600 hover:text-blue-700 font-medium cursor-pointer">Esqueceu a senha?</button>
                    </div>
                    <InputGroup className="bg-white h-11 rounded-xl border border-gray-200 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-600/10 transition-all">
                      <InputGroupAddon align="inline-start">
                        <Lock size={16} className="text-gray-300" />
                      </InputGroupAddon>
                      <InputGroupInput
                        {...field}
                        id="password"
                        type="password"
                        aria-invalid={fieldState.invalid}
                        placeholder="••••••••"
                        autoComplete="off"
                        className="text-sm"
                      />
                    </InputGroup>
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
            </FieldGroup>

            <Button
              type="submit"
              form="login-form"
              disabled={isLoading}
              className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>Entrar <ArrowRight size={14} /></>
              )}
            </Button>
          </form>

          {/* Bottom text */}
          <div className="mt-10 pt-6 border-t border-gray-200/60 text-center">
            <p className="text-[10px] text-gray-300">
              Sistema de uso interno — MV Gestão
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
