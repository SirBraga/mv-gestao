"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useState } from "react"

const MINUTE = 1000 * 60

export function QueryProvider({ children }: { children: React.ReactNode }) {
    const [queryClient] = useState(() => new QueryClient({
        defaultOptions: {
            queries: {
                // Dados são considerados frescos por 5 minutos
                staleTime: 5 * MINUTE,
                // Garbage collection após 30 minutos
                gcTime: 30 * MINUTE,
                // Não refetch ao focar janela (evita requisições desnecessárias)
                refetchOnWindowFocus: false,
                // Não refetch ao reconectar
                refetchOnReconnect: false,
                // Retry apenas 1 vez em caso de erro
                retry: 1,
                // Retry delay exponencial
                retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
            },
            mutations: {
                // Retry mutations apenas 1 vez
                retry: 1,
            },
        },
    }))

    return (
        <QueryClientProvider client={queryClient}>
            {children}
        </QueryClientProvider>
    )
}
