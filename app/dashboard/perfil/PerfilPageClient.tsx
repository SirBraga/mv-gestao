"use client"

import { useEffect, useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Camera, Loader2, Lock, Save, UserRound } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "react-toastify"
import { getProfile, updateProfile } from "@/app/actions/profile"
import { ImagePositioner } from "@/app/dashboard/_components/ImagePositioner"
import { uploadFile } from "@/app/utils/upload"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"

type ProfileData = {
  id: string
  name: string
  email: string
  image: string | null
  role: string
}

interface PerfilPageClientProps {
  initialProfile: ProfileData
}

export default function PerfilPageClient({ initialProfile }: PerfilPageClientProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [name, setName] = useState(initialProfile.name)
  const [photoSrc, setPhotoSrc] = useState<string | null>(initialProfile.image || null)
  const [photoPosition, setPhotoPosition] = useState("50% 50%")
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: () => getProfile(),
    initialData: initialProfile,
    staleTime: 60 * 1000,
  })

  useEffect(() => {
    if (!profile) return
    setName(profile.name)
    setPhotoSrc(profile.image || null)
  }, [profile])

  const hasProfileChanges = useMemo(() => {
    return name.trim() !== (profile?.name || "") || photoFile !== null || (photoFile === null && photoSrc !== (profile?.image || null))
  }, [name, photoFile, photoSrc, profile])

  const profileMutation = useMutation({
    mutationFn: async () => {
      let image = photoSrc
      if (photoFile) {
        const uploaded = await uploadFile(photoFile, "avatars")
        image = uploaded.url
      }
      return updateProfile({ name, image })
    },
    onSuccess: (result) => {
      queryClient.setQueryData(["profile"], result.user)
      queryClient.invalidateQueries({ queryKey: ["profile"] })
      queryClient.invalidateQueries({ queryKey: ["chat-users"] })
      setPhotoFile(null)
      setPhotoSrc(result.user.image || null)
      toast.success("Perfil atualizado com sucesso!")
      router.refresh()
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao atualizar perfil")
    },
  })

  const passwordMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          revokeOtherSessions: false,
        }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => null)
        throw new Error(data?.message || data?.error?.message || "Não foi possível alterar a senha")
      }

      return response.json().catch(() => ({ status: true }))
    },
    onSuccess: () => {
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
      toast.success("Senha atualizada com sucesso!")
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao alterar senha")
    },
  })

  const handlePhotoFileSelect = (file: File) => {
    setPhotoFile(file)
    setPhotoSrc(URL.createObjectURL(file))
    setPhotoPosition("50% 50%")
  }

  const handlePhotoRemove = () => {
    setPhotoFile(null)
    setPhotoSrc(null)
    setPhotoPosition("50% 50%")
  }

  const handleProfileSubmit = () => {
    if (!name.trim()) {
      toast.error("Informe seu nome")
      return
    }

    profileMutation.mutate()
  }

  const handlePasswordSubmit = () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("Preencha todos os campos de senha")
      return
    }

    if (newPassword.length < 8) {
      toast.error("A nova senha deve ter pelo menos 8 caracteres")
      return
    }

    if (newPassword !== confirmPassword) {
      toast.error("A confirmação da senha não confere")
      return
    }

    passwordMutation.mutate()
  }

  return (
    <div className="h-full overflow-y-auto bg-slate-50">
      <div className="w-full p-8">
        <div className="mb-6 rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                <UserRound size={12} /> Meu perfil
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">Gerencie seus dados</h1>
              <p className="mt-2 text-sm leading-6 text-slate-500">Atualize seu nome, sua foto de perfil e sua senha sem sair da dashboard.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              <p className="font-medium text-slate-900">{profile?.email}</p>
              <p className="capitalize">{profile?.role.toLowerCase()}</p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-900">
                <Camera size={18} /> Informações do perfil
              </CardTitle>
              <CardDescription>Esses dados aparecem na navegação e nas áreas internas do sistema.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
                <div className="w-full max-w-52">
                  <ImagePositioner
                    src={photoSrc}
                    position={photoPosition}
                    onPositionChange={setPhotoPosition}
                    onFileSelect={handlePhotoFileSelect}
                    onRemove={handlePhotoRemove}
                    aspectClass="aspect-square"
                    label="Foto"
                    rounded
                  />
                </div>

                <div className="min-w-0 flex-1 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="profile-name">Nome</Label>
                    <Input id="profile-name" value={name} onChange={(event) => setName(event.target.value)} className="h-11 rounded-xl border-slate-200 bg-white" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="profile-email">E-mail</Label>
                    <Input id="profile-email" value={profile?.email || ""} disabled className="h-11 rounded-xl border-slate-200 bg-slate-50 text-slate-500" />
                  </div>

                  <Alert className="border-slate-200 bg-slate-50 text-slate-700">
                    <UserRound className="text-slate-500" />
                    <AlertTitle>Atualização imediata</AlertTitle>
                    <AlertDescription>
                      Ao salvar, a sidebar e os demais pontos do sistema passam a refletir seus novos dados sem precisar recarregar manualmente a página.
                    </AlertDescription>
                  </Alert>
                </div>
              </div>

              <Separator className="bg-slate-200" />

              <div className="flex flex-wrap items-center justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl border-slate-200"
                  onClick={() => {
                    setName(profile?.name || initialProfile.name)
                    setPhotoSrc(profile?.image || initialProfile.image || null)
                    setPhotoFile(null)
                    setPhotoPosition("50% 50%")
                  }}
                >
                  Descartar
                </Button>
                <Button
                  type="button"
                  className="rounded-xl bg-slate-900 text-white hover:bg-slate-800"
                  onClick={handleProfileSubmit}
                  disabled={!hasProfileChanges || profileMutation.isPending}
                >
                  {profileMutation.isPending ? <Loader2 className="animate-spin" /> : <Save size={16} />}
                  Salvar perfil
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-900">
                <Lock size={18} /> Segurança
              </CardTitle>
              <CardDescription>Altere sua senha usando o fluxo do Better Auth já adotado pelo projeto.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current-password">Senha atual</Label>
                <Input id="current-password" type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} className="h-11 rounded-xl border-slate-200 bg-white" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-password">Nova senha</Label>
                <Input id="new-password" type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} className="h-11 rounded-xl border-slate-200 bg-white" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirmar nova senha</Label>
                <Input id="confirm-password" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="h-11 rounded-xl border-slate-200 bg-white" />
              </div>

              <Alert className="border-amber-200 bg-amber-50 text-amber-900">
                <Lock className="text-amber-700" />
                <AlertTitle>Boa prática</AlertTitle>
                <AlertDescription>Use pelo menos 8 caracteres e combine letras, números e símbolos para aumentar a segurança.</AlertDescription>
              </Alert>

              <div className="flex justify-end">
                <Button
                  type="button"
                  className="rounded-xl bg-slate-900 text-white hover:bg-slate-800"
                  onClick={handlePasswordSubmit}
                  disabled={passwordMutation.isPending}
                >
                  {passwordMutation.isPending ? <Loader2 className="animate-spin" /> : <Lock size={16} />}
                  Alterar senha
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
