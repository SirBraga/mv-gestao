"use client"

import { useEffect, useState, useCallback } from "react"
import { usePathname } from "next/navigation"

export function NavigationLoader() {
    const pathname = usePathname()
    const [loading, setLoading] = useState(false)
    const [progress, setProgress] = useState(0)

    const startLoading = useCallback(() => {
        setLoading(true)
        setProgress(0)
    }, [])

    useEffect(() => {
        // Intercept link clicks to detect navigation
        const handleClick = (e: MouseEvent) => {
            const anchor = (e.target as HTMLElement).closest("a")
            if (anchor && anchor.href && anchor.href.startsWith(window.location.origin)) {
                const url = new URL(anchor.href)
                if (url.pathname !== pathname) {
                    startLoading()
                }
            }
        }
        document.addEventListener("click", handleClick, true)
        return () => document.removeEventListener("click", handleClick, true)
    }, [pathname, startLoading])

    // Animate progress
    useEffect(() => {
        if (!loading) return
        const interval = setInterval(() => {
            setProgress(prev => {
                if (prev >= 90) return prev
                return prev + (90 - prev) * 0.1
            })
        }, 100)
        return () => clearInterval(interval)
    }, [loading])

    // Complete on pathname change
    useEffect(() => {
        if (loading) {
            setProgress(100)
            const timeout = setTimeout(() => {
                setLoading(false)
                setProgress(0)
            }, 300)
            return () => clearTimeout(timeout)
        }
    }, [pathname]) // eslint-disable-line react-hooks/exhaustive-deps

    if (!loading && progress === 0) return null

    return (
        <div className="fixed top-0 left-0 right-0 z-9999 h-0.5">
            <div
                className="h-full bg-blue-400 transition-all duration-200 ease-out"
                style={{
                    width: `${progress}%`,
                    opacity: progress === 100 ? 0 : 1,
                    transition: progress === 100 ? "width 200ms, opacity 300ms 100ms" : "width 200ms",
                }}
            />
        </div>
    )
}
