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
import { Mail, Lock, ArrowRight, Shield, Building2 } from "lucide-react"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import { authClient } from "./utils/auth-client"
import { toast } from "react-toastify"
import { useRouter } from "next/navigation"
import { useState } from "react"

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "Senha obrigatória")
})

export default function LoginPageClient() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: ""
    }
  })

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
    <div className="min-h-screen flex bg-slate-100">
      <div className="hidden lg:flex w-[40rem] shrink-0 bg-linear-to-br from-slate-950 via-indigo-950 to-blue-700 flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23fff' fill-opacity='1'%3E%3Cpath d='M0 0h1v40H0zM40 0h1v40h-1zM0 0h40v1H0zM0 40h40v1H0z'/%3E%3C/g%3E%3C/svg%3E\")" }} />
        <div className="absolute -top-24 -right-16 h-80 w-80 rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="absolute top-1/3 left-16 h-64 w-64 rounded-full bg-violet-500/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-blue-500/20 blur-3xl" />

        <div className="relative z-10">
          <div className="inline-flex items-center gap-4 rounded-2xl border border-white/10 bg-white/8 px-5 py-4 backdrop-blur-md shadow-2xl shadow-black/10">
            <div className="relative h-14 w-20">
              <Image
                src="/root/logo.png"
                alt="Logo"
                fill
                className="object-contain brightness-0 invert"
              />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-100/70">MV Desk</p>
              <p className="mt-1 text-sm text-white/80">Central interna de atendimento</p>
            </div>
          </div>
        </div>

        <div className="relative z-10 max-w-md">
          <h1 className="text-5xl font-bold text-white leading-[1.02] mb-5">
            MV Desk
          </h1>
          <p className="text-blue-100/75 text-base leading-relaxed max-w-sm mb-10">
            Acesse sua central interna com foco em tickets, clientes e operação.
          </p>

          <div className="grid grid-cols-1 gap-3 max-w-sm">
            {[
              "Atendimento interno centralizado",
              "Acesso rápido ao painel operacional",
              "Ambiente restrito a usuários autorizados",
            ].map((item) => (
              <div key={item} className="rounded-2xl border border-white/10 bg-white/8 px-4 py-3 backdrop-blur-md shadow-lg shadow-black/10">
                <p className="text-sm text-white/88">{item}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/6 px-4 py-3 backdrop-blur-sm w-fit">
            <Building2 size={16} className="text-blue-100/70" />
            <p className="text-xs text-blue-100/55">
              Uso interno — acesso restrito a colaboradores autorizados
            </p>
          </div>
        </div>
      </div>

      <div className="relative flex-1 flex items-center justify-center overflow-hidden bg-radial-[at_top] from-indigo-100 via-slate-50 to-white p-6 lg:p-10">
        <div className="absolute inset-0 opacity-60" style={{ backgroundImage: "linear-gradient(to right, rgba(148,163,184,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,0.08) 1px, transparent 1px)", backgroundSize: "32px 32px" }} />
        <div className="absolute top-10 right-10 h-48 w-48 rounded-full bg-indigo-200/30 blur-3xl" />
        <div className="absolute bottom-10 left-10 h-48 w-48 rounded-full bg-cyan-200/30 blur-3xl" />

        <div className="relative z-10 w-full max-w-md">
          <div className="lg:hidden flex justify-center mb-8">
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white/90 px-5 py-4 shadow-sm backdrop-blur">
              <div className="relative h-12 w-16">
                <Image src="/root/logo.png" alt="Logo" fill className="object-contain" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">MV Desk</p>
                <p className="mt-1 text-sm font-medium text-slate-700">Acesso interno</p>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white/92 shadow-[0_20px_80px_-30px_rgba(15,23,42,0.35)] backdrop-blur-xl">
            <div className="border-b border-slate-100 bg-linear-to-r from-white via-slate-50 to-indigo-50/60 px-7 py-7">
              <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-[11px] font-medium text-indigo-700">
                <Shield size={13} />
                Acesso corporativo seguro
              </div>
              <div className="mt-5">
                <h2 className="text-2xl font-bold text-slate-900">Entrar no sistema</h2>
                <p className="text-sm text-slate-500 mt-2 leading-relaxed">Use suas credenciais para acessar o MV Desk.</p>
              </div>
            </div>

            <div className="px-7 py-7">
              <form id="login-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                <FieldGroup>
                  <Controller
                    name="email"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <label htmlFor="email" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Email</label>
                        <InputGroup className="h-12 rounded-2xl border-slate-200 bg-slate-50/80 shadow-none transition-all focus-within:border-indigo-400 focus-within:bg-white focus-within:ring-4 focus-within:ring-indigo-500/10">
                          <InputGroupAddon align="inline-start">
                            <Mail size={16} className="text-slate-400" />
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
                          <FieldError errors={[fieldState.error]} className="mt-1.5 text-xs" />
                        )}
                      </Field>
                    )}
                  />
                  <Controller
                    name="password"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <div className="mb-1.5 flex items-center justify-between">
                          <label htmlFor="password" className="text-xs font-semibold uppercase tracking-wide text-slate-500">Senha</label>
                          <button type="button" className="text-[11px] text-indigo-600 hover:text-indigo-700 font-medium cursor-pointer">Esqueceu a senha?</button>
                        </div>
                        <InputGroup className="h-12 rounded-2xl border-slate-200 bg-slate-50/80 shadow-none transition-all focus-within:border-indigo-400 focus-within:bg-white focus-within:ring-4 focus-within:ring-indigo-500/10">
                          <InputGroupAddon align="inline-start">
                            <Lock size={16} className="text-slate-400" />
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
                          <FieldError errors={[fieldState.error]} className="mt-1.5 text-xs" />
                        )}
                      </Field>
                    )}
                  />
                </FieldGroup>

                <Button
                  type="submit"
                  form="login-form"
                  disabled={isLoading}
                  className="h-12 w-full rounded-2xl bg-linear-to-r from-indigo-600 to-blue-600 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 transition-all hover:from-indigo-700 hover:to-blue-700 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {isLoading ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  ) : (
                    <>Entrar <ArrowRight size={14} /></>
                  )}
                </Button>
              </form>
            </div>

            <div className="border-t border-slate-100 bg-slate-50/80 px-7 py-4 text-center">
              <p className="text-[11px] text-slate-400">
                Sistema de uso interno — MV Desk
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
