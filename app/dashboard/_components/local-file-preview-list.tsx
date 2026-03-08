"use client"

import { useEffect, useMemo } from "react"
import { FileText, Image as ImageIcon, X } from "lucide-react"

interface LocalFilePreviewListProps {
    files: File[]
    onRemove: (index: number) => void
    emptyMessage?: string
    compact?: boolean
}

function formatFileSize(bytes: number) {
    if (bytes < 1024) return `${bytes}B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}

export default function LocalFilePreviewList({ files, onRemove, compact = false }: LocalFilePreviewListProps) {
    const previews = useMemo(() => files.map((file) => ({
        file,
        url: file.type.startsWith("image/") ? URL.createObjectURL(file) : null,
    })), [files])

    useEffect(() => {
        return () => {
            previews.forEach((preview) => {
                if (preview.url) URL.revokeObjectURL(preview.url)
            })
        }
    }, [previews])

    if (files.length === 0) return null

    if (compact) {
        return (
            <div className="flex flex-wrap gap-2 mt-2">
                {previews.map((preview, index) => (
                    <div key={`${preview.file.name}-${index}`} className="relative group/file shrink-0">
                        {preview.url ? (
                            <img src={preview.url} alt={preview.file.name} className="w-14 h-14 rounded-lg object-cover border border-slate-200" />
                        ) : (
                            <div className="w-14 h-14 rounded-lg border border-slate-200 bg-slate-50 flex flex-col items-center justify-center px-1">
                                <FileText size={14} className="text-slate-400 mb-1" />
                                <span className="text-[8px] text-slate-500 text-center line-clamp-2 break-all">{preview.file.name}</span>
                            </div>
                        )}
                        <button type="button" onClick={() => onRemove(index)} className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover/file:opacity-100 transition-opacity cursor-pointer">
                            <X size={10} />
                        </button>
                    </div>
                ))}
            </div>
        )
    }

    return (
        <div className="grid grid-cols-2 gap-2 mt-3">
            {previews.map((preview, index) => (
                <div key={`${preview.file.name}-${index}`} className="relative rounded-xl border border-slate-200 bg-slate-50 p-2 group/file">
                    {preview.url ? (
                        <div className="space-y-2">
                            <img src={preview.url} alt={preview.file.name} className="w-full h-28 rounded-lg object-cover border border-slate-200 bg-white" />
                            <div>
                                <p className="text-xs font-medium text-slate-700 truncate">{preview.file.name}</p>
                                <p className="text-[11px] text-slate-500">{formatFileSize(preview.file.size)}</p>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-start gap-2 min-w-0">
                            <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0">
                                <FileText size={16} className="text-slate-400" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-xs font-medium text-slate-700 break-all line-clamp-2">{preview.file.name}</p>
                                <p className="text-[11px] text-slate-500 mt-1">{formatFileSize(preview.file.size)}</p>
                            </div>
                        </div>
                    )}
                    <button type="button" onClick={() => onRemove(index)} className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white/90 border border-slate-200 text-slate-500 hover:text-red-500 flex items-center justify-center opacity-0 group-hover/file:opacity-100 transition-opacity cursor-pointer">
                        <X size={12} />
                    </button>
                </div>
            ))}
        </div>
    )
}
