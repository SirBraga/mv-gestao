export type EntityType = "PF" | "PJ"

export function getEntityDisplayName(data: {
    type?: EntityType | null
    name?: string | null
    razaoSocial?: string | null
    nomeFantasia?: string | null
}) {
    if (data.type === "PJ") {
        return data.nomeFantasia?.trim() || data.razaoSocial?.trim() || data.name?.trim() || ""
    }

    return data.name?.trim() || data.razaoSocial?.trim() || data.nomeFantasia?.trim() || ""
}

export function getEntityLegalName(data: {
    type?: EntityType | null
    name?: string | null
    razaoSocial?: string | null
}) {
    if (data.type === "PJ") {
        return data.razaoSocial?.trim() || data.name?.trim() || ""
    }

    return data.name?.trim() || ""
}

export function getEntitySecondaryName(data: {
    type?: EntityType | null
    name?: string | null
    razaoSocial?: string | null
    nomeFantasia?: string | null
}) {
    if (data.type === "PJ") {
        const displayName = getEntityDisplayName(data)
        const legalName = getEntityLegalName(data)

        if (displayName && legalName && displayName !== legalName) {
            return legalName
        }

        return ""
    }

    return ""
}
