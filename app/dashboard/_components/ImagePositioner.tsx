"use client"

import { useState, useRef, useCallback } from "react"
import { Image as ImageIcon, Upload, Move, Check, Trash2 } from "lucide-react"

interface Props {
    src: string | null
    position: string
    onPositionChange: (pos: string) => void
    onFileSelect: (file: File) => void
    onRemove: () => void
    aspectClass?: string
    label?: string
    rounded?: boolean
}

export function ImagePositioner({
    src,
    position,
    onPositionChange,
    onFileSelect,
    onRemove,
    aspectClass = "aspect-square",
    label = "Imagem",
    rounded = false,
}: Props) {
    const [adjusting, setAdjusting] = useState(false)
    const [dragging, setDragging] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const startRef = useRef({ x: 0, y: 0, posX: 50, posY: 50 })

    const parsePosition = useCallback((pos: string) => {
        const parts = pos.split(" ").map((p) => parseFloat(p))
        return { x: parts[0] || 50, y: parts[1] || 50 }
    }, [])

    const handlePointerDown = useCallback(
        (e: React.PointerEvent) => {
            if (!adjusting || !src) return
            e.preventDefault()
            setDragging(true)
            const pos = parsePosition(position)
            startRef.current = { x: e.clientX, y: e.clientY, posX: pos.x, posY: pos.y }
            const el = e.currentTarget as HTMLElement
            el.setPointerCapture(e.pointerId)
        },
        [adjusting, src, position, parsePosition]
    )

    const handlePointerMove = useCallback(
        (e: React.PointerEvent) => {
            if (!dragging || !containerRef.current) return
            e.preventDefault()
            const rect = containerRef.current.getBoundingClientRect()
            const deltaX = ((e.clientX - startRef.current.x) / rect.width) * -100
            const deltaY = ((e.clientY - startRef.current.y) / rect.height) * -100
            const newX = Math.max(0, Math.min(100, startRef.current.posX + deltaX))
            const newY = Math.max(0, Math.min(100, startRef.current.posY + deltaY))
            onPositionChange(`${Math.round(newX)}% ${Math.round(newY)}%`)
        },
        [dragging, onPositionChange]
    )

    const handlePointerUp = useCallback(() => {
        setDragging(false)
    }, [])

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            onFileSelect(file)
            onPositionChange("50% 50%")
        }
        e.target.value = ""
    }

    const roundedClass = rounded ? "rounded-full" : "rounded-xl"

    if (!src) {
        return (
            <div>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileInput} />
                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className={`w-full ${aspectClass} ${roundedClass} border-2 border-dashed border-gray-200 hover:border-blue-300 bg-gray-50 flex flex-col items-center justify-center gap-2 transition-all overflow-hidden group/img cursor-pointer`}
                >
                    <ImageIcon className="w-8 h-8 text-gray-300 group-hover/img:text-gray-400 transition-colors" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{label}</span>
                    <span className="text-[10px] text-gray-400 flex items-center gap-1">
                        <Upload className="w-3 h-3" /> Clique para enviar
                    </span>
                </button>
            </div>
        )
    }

    return (
        <div>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileInput} />
            <div
                ref={containerRef}
                className={`relative w-full ${aspectClass} ${roundedClass} overflow-hidden border-2 ${adjusting ? "border-blue-400 shadow-lg shadow-blue-500/10" : "border-gray-200"} transition-all`}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                style={{ cursor: adjusting ? (dragging ? "grabbing" : "grab") : "default", touchAction: "none" }}
            >
                <img
                    src={src}
                    alt="Preview"
                    className="w-full h-full object-cover pointer-events-none select-none"
                    style={{ objectPosition: position }}
                    draggable={false}
                />

                {adjusting && (
                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center pointer-events-none">
                        <div className="bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-lg flex items-center gap-2 text-white text-[11px] font-semibold">
                            <Move className="w-3.5 h-3.5" />
                            Arraste para ajustar
                        </div>
                    </div>
                )}

                {!adjusting && (
                    <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-colors flex items-end justify-center pb-2 opacity-0 hover:opacity-100">
                        <span className="text-[10px] text-white/70 bg-black/50 px-2 py-1 rounded-md">
                            Clique em &quot;Ajustar&quot; para reposicionar
                        </span>
                    </div>
                )}
            </div>

            <div className="flex items-center gap-2 mt-2">
                {adjusting ? (
                    <button
                        type="button"
                        onClick={() => setAdjusting(false)}
                        className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md transition-colors cursor-pointer"
                    >
                        <Check className="w-3 h-3" /> Confirmar
                    </button>
                ) : (
                    <button
                        type="button"
                        onClick={() => setAdjusting(true)}
                        className="flex items-center gap-1 text-[10px] font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md transition-colors cursor-pointer"
                    >
                        <Move className="w-3 h-3" /> Ajustar
                    </button>
                )}
                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-gray-700 transition-colors cursor-pointer"
                >
                    <Upload className="w-3 h-3" /> Trocar
                </button>
                <button
                    type="button"
                    onClick={onRemove}
                    className="flex items-center gap-1 text-[10px] text-red-400 hover:text-red-500 transition-colors ml-auto cursor-pointer"
                >
                    <Trash2 className="w-3 h-3" /> Remover
                </button>
            </div>
        </div>
    )
}
