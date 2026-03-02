export async function uploadFile(file: File, folder: string = "general"): Promise<{
    url: string
    fileName: string
    fileType: string
    fileSize: number
}> {
    const formData = new FormData()
    formData.append("file", file)
    formData.append("folder", folder)

    const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
    })

    if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Erro ao fazer upload")
    }

    return res.json()
}
