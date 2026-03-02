import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/app/utils/auth"
import { headers } from "next/headers"
import { uploadToMinio } from "@/app/utils/minio"

const ALLOWED_TYPES = [
    "image/jpeg", "image/png", "image/webp", "image/gif", "image/avif",
    "application/pdf",
    "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/plain", "text/csv",
]

const MAX_SIZE = 10 * 1024 * 1024 // 10MB

export async function POST(req: NextRequest) {
    try {
        const session = await auth.api.getSession({ headers: await headers() })
        if (!session) {
            return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
        }

        const formData = await req.formData()
        const file = formData.get("file") as File | null
        const folder = (formData.get("folder") as string) || "general"

        if (!file) {
            return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 })
        }

        if (!ALLOWED_TYPES.includes(file.type)) {
            return NextResponse.json({ error: "Tipo de arquivo não permitido" }, { status: 400 })
        }

        if (file.size > MAX_SIZE) {
            return NextResponse.json({ error: "Arquivo muito grande. Máximo 10MB." }, { status: 400 })
        }

        const ext = file.name.split(".").pop() || "bin"
        const safeName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`
        const key = `${folder}/${safeName}`

        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)

        const url = await uploadToMinio(key, buffer, file.type)

        return NextResponse.json({
            url,
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
        })
    } catch (err) {
        console.error("Upload error:", err)
        return NextResponse.json({ error: "Erro interno no upload" }, { status: 500 })
    }
}
