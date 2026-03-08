// Opções hard-coded centralizadas para fácil manutenção

export const CONTACT_ROLES = [
  { value: "socio", label: "Sócio" },
  { value: "gerente", label: "Gerente" },
  { value: "colaborador", label: "Colaborador" },
] as const

export const CERTIFICATE_TYPES = [
  { value: "A1", label: "A1" },
  { value: "A3", label: "A3" },
  { value: "B1", label: "B1" },
] as const

export const CLIENT_TYPES = [
  { value: "PF", label: "Pessoa Física" },
  { value: "PJ", label: "Pessoa Jurídica" },
] as const

export const CONTRACT_TYPES = [
  { value: "mensal", label: "Mensal" },
  { value: "trimestral", label: "Trimestral" },
  { value: "semestral", label: "Semestral" },
  { value: "anual", label: "Anual" },
] as const

export const STATES = [
  { value: "AC", label: "Acre" },
  { value: "AL", label: "Alagoas" },
  { value: "AP", label: "Amapá" },
  { value: "AM", label: "Amazonas" },
  { value: "BA", label: "Bahia" },
  { value: "CE", label: "Ceará" },
  { value: "DF", label: "Distrito Federal" },
  { value: "ES", label: "Espírito Santo" },
  { value: "GO", label: "Goiás" },
  { value: "MA", label: "Maranhão" },
  { value: "MT", label: "Mato Grosso" },
  { value: "MS", label: "Mato Grosso do Sul" },
  { value: "MG", label: "Minas Gerais" },
  { value: "PA", label: "Pará" },
  { value: "PB", label: "Paraíba" },
  { value: "PR", label: "Paraná" },
  { value: "PE", label: "Pernambuco" },
  { value: "PI", label: "Piauí" },
  { value: "RJ", label: "Rio de Janeiro" },
  { value: "RN", label: "Rio Grande do Norte" },
  { value: "RS", label: "Rio Grande do Sul" },
  { value: "RO", label: "Rondônia" },
  { value: "RR", label: "Roraima" },
  { value: "SC", label: "Santa Catarina" },
  { value: "SP", label: "São Paulo" },
  { value: "SE", label: "Sergipe" },
  { value: "TO", label: "Tocantins" },
] as const

// Helper functions
export function getContactRoleLabel(value: string): string {
  const role = CONTACT_ROLES.find(r => r.value === value)
  return role?.label || value
}

export function getCertificateTypeLabel(value: string): string {
  const cert = CERTIFICATE_TYPES.find(c => c.value === value)
  return cert?.label || value
}
