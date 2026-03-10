"use server"

function digitsOnly(value: string) {
    return value.replace(/\D/g, "")
}

export async function lookupCnpj(cnpj: string) {
    const normalizedCnpj = digitsOnly(cnpj)

    if (normalizedCnpj.length !== 14) {
        throw new Error("Informe um CNPJ válido")
    }

    const response = await fetch(`https://publica.cnpj.ws/cnpj/${normalizedCnpj}`, {
        headers: {
            Accept: "application/json",
        },
        cache: "no-store",
    })

    if (!response.ok) {
        throw new Error("Não foi possível consultar o CNPJ informado")
    }

    const data = await response.json()
    const estabelecimento = data.estabelecimento
    const atividadePrincipal = estabelecimento?.atividade_principal
    const inscricaoEstadualAtiva = estabelecimento?.inscricoes_estaduais?.find((item: { ativo?: boolean }) => item.ativo)

    return {
        cnpj: estabelecimento?.cnpj || normalizedCnpj,
        razaoSocial: data.razao_social || "",
        nomeFantasia: estabelecimento?.nome_fantasia || "",
        ie: inscricaoEstadualAtiva?.inscricao_estadual || "",
        cnae: atividadePrincipal?.subclasse || atividadePrincipal?.id || "",
        businessSector: atividadePrincipal?.descricao || "",
        email: estabelecimento?.email || "",
        phone: estabelecimento?.ddd1 && estabelecimento?.telefone1
            ? `${estabelecimento.ddd1}${estabelecimento.telefone1}`
            : "",
        address: [estabelecimento?.tipo_logradouro, estabelecimento?.logradouro].filter(Boolean).join(" "),
        houseNumber: estabelecimento?.numero || "",
        neighborhood: estabelecimento?.bairro || "",
        zipCode: estabelecimento?.cep || "",
        city: estabelecimento?.cidade?.nome || "",
        state: estabelecimento?.estado?.sigla || "",
        openedAt: estabelecimento?.data_inicio_atividade || "",
        legalNature: data.natureza_juridica?.descricao || "",
        companySize: data.porte?.descricao || "",
        simples: data.simples?.simples || "",
        mei: data.simples?.mei || "",
        mainActivity: atividadePrincipal?.descricao || "",
    }
}
