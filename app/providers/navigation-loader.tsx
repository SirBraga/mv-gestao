"use client"

import { useEffect, useRef, useState } from "react"
import { usePathname } from "next/navigation"
import { useIsFetching } from "@tanstack/react-query"
import { GlobalScreenLoader } from "@/app/components/global-screen-loader"

export function NavigationLoader() {
    const pathname = usePathname()
    const isFetching = useIsFetching()
    const [loading, setLoading] = useState(true)
    const pathnameRef = useRef(pathname)

    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            const anchor = (e.target as HTMLElement).closest("a")
            if (anchor && anchor.href && anchor.href.startsWith(window.location.origin)) {
                const url = new URL(anchor.href)
                if (url.pathname !== pathname) {
                    setLoading(true)
                }
            }
        }
        document.addEventListener("click", handleClick, true)
        return () => document.removeEventListener("click", handleClick, true)
    }, [pathname])

    useEffect(() => {
        if (pathnameRef.current !== pathname) {
            pathnameRef.current = pathname
            setLoading(true)
        }
    }, [pathname])

    useEffect(() => {
        if (isFetching > 0) {
            setLoading(true)
            return
        }

        const timeout = setTimeout(() => {
            setLoading(false)
        }, 220)

        return () => clearTimeout(timeout)
    }, [isFetching, pathname])

    return <GlobalScreenLoader visible={loading} />
}
