export function maskCPF(value: string): string {
    const digits = value.replace(/\D/g, "").slice(0, 11)
    return digits
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d{1,2})$/, "$1-$2")
}

export function maskCNPJ(value: string): string {
    const digits = value.replace(/\D/g, "").slice(0, 14)
    return digits
        .replace(/(\d{2})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d)/, "$1/$2")
        .replace(/(\d{4})(\d{1,2})$/, "$1-$2")
}

export function maskPhone(value: string): string {
    const digits = value.replace(/\D/g, "").slice(0, 11)
    if (digits.length <= 10) {
        return digits
            .replace(/(\d{2})(\d)/, "($1) $2")
            .replace(/(\d{4})(\d{1,4})$/, "$1-$2")
    }
    return digits
        .replace(/(\d{2})(\d)/, "($1) $2")
        .replace(/(\d{5})(\d{1,4})$/, "$1-$2")
}

export function maskCEP(value: string): string {
    const digits = value.replace(/\D/g, "").slice(0, 8)
    return digits.replace(/(\d{5})(\d{1,3})$/, "$1-$2")
}

export function maskContactTime(value: string): string {
    // Formato: HH:MM - HH:MM (ex: 09:00 - 18:00)
    const digits = value.replace(/\D/g, "")
    const cleaned = digits.slice(0, 8) // 8 dígitos: HHMMHHMM
    
    if (cleaned.length <= 2) {
        return cleaned
    }
    if (cleaned.length <= 4) {
        return `${cleaned.slice(0, 2)}:${cleaned.slice(2)}`
    }
    if (cleaned.length <= 6) {
        return `${cleaned.slice(0, 2)}:${cleaned.slice(2, 4)} - ${cleaned.slice(4, 6)}`
    }
    return `${cleaned.slice(0, 2)}:${cleaned.slice(2, 4)} - ${cleaned.slice(4, 6)}:${cleaned.slice(6, 8)}`
}

export function unmask(value: string): string {
    return value.replace(/\D/g, "")
}
