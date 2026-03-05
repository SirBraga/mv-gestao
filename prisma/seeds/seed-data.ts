import "dotenv/config"
import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "../../app/generated/prisma/client"
import { Pool } from "pg"

const connectionString = process.env.DATABASE_URL!
const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

const PRODUCT_IDS = ["cmmdpze620001pppnokr0zqoz", "cmm9jglzs000101o7e5zrkmpb"]

const COMPANY_NAMES = [
    "Tech Solutions Ltda", "Comercial São Paulo", "Indústria Brasil S/A", "Serviços Gerais ME",
    "Construtora Horizonte", "Alimentos Naturais", "Transportadora Rápida", "Farmácia Popular",
    "Consultoria Empresarial", "Escola Moderna", "Clínica Saúde Total", "Advocacia Silva & Santos",
    "Contabilidade Precisa", "Engenharia Estrutural", "Design Criativo", "Marketing Digital Pro",
    "Restaurante Sabor", "Hotel Conforto", "Turismo Aventura", "Logística Eficiente",
    "Metalúrgica Industrial", "Têxtil Fashion", "Móveis Planejados", "Eletrônicos Tech",
    "Cosméticos Beleza", "Imobiliária Prime", "Seguros Confiança", "Financeira Capital",
    "Distribuidora Atacado", "Varejo Popular", "E-commerce Brasil", "Startup Inovação",
    "Agropecuária Verde", "Mineração Forte", "Energia Sustentável", "Saneamento Limpo",
    "Telecom Conecta", "Mídia News"
]

const PERSON_NAMES = ["João Silva", "Maria Santos"]

const CITIES = [
    { city: "São Paulo", state: "SP" }, { city: "Rio de Janeiro", state: "RJ" },
    { city: "Belo Horizonte", state: "MG" }, { city: "Curitiba", state: "PR" },
    { city: "Porto Alegre", state: "RS" }, { city: "Salvador", state: "BA" },
    { city: "Brasília", state: "DF" }, { city: "Fortaleza", state: "CE" }
]

const BUSINESS_SECTORS = [
    "Comércio", "Serviços", "Indústria", "Construção Civil", "Tecnologia da Informação",
    "Saúde", "Educação", "Transporte", "Alimentação", "Consultoria"
]

const TICKET_DESCRIPTIONS = [
    "Sistema não está emitindo nota fiscal corretamente",
    "Erro ao importar XML de fornecedor",
    "Dúvida sobre configuração de impostos",
    "Problema na integração com banco",
    "Solicitação de treinamento para novo usuário",
    "Relatório de vendas não está gerando",
    "Backup do sistema apresentando falha",
    "Certificado digital vencido - renovação",
    "Configuração de impressora fiscal",
    "Atualização de cadastro de produtos"
]

function randomDate(start: Date, end: Date): Date {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()))
}

function generateCNPJ(): string {
    const n = () => Math.floor(Math.random() * 10)
    return `${n()}${n()}.${n()}${n()}${n()}.${n()}${n()}${n()}/${n()}${n()}${n()}${n()}-${n()}${n()}`
}

function generateCPF(): string {
    const n = () => Math.floor(Math.random() * 10)
    return `${n()}${n()}${n()}.${n()}${n()}${n()}.${n()}${n()}${n()}-${n()}${n()}`
}

function generatePhone(): string {
    return `(${Math.floor(Math.random() * 90) + 10}) ${Math.floor(Math.random() * 90000) + 10000}-${Math.floor(Math.random() * 9000) + 1000}`
}

async function seedData() {
    console.log("🌱 Iniciando seed de dados...")

    const now = new Date()
    const dec2024 = new Date(2024, 11, 1)
    const jan2025 = new Date(2025, 0, 1)
    const feb2025 = new Date(2025, 1, 1)
    const mar2025 = new Date(2025, 2, 1)

    // Criar 20 contabilidades
    console.log("📊 Criando 20 contabilidades...")
    const contabilidades = []
    for (let i = 0; i < 20; i++) {
        const location = CITIES[Math.floor(Math.random() * CITIES.length)]
        const contab = await prisma.contability.create({
            data: {
                name: `Contabilidade ${location.city} ${i + 1}`,
                cnpj: generateCNPJ(),
                phone: generatePhone(),
                email: `contato@contabilidade${i + 1}.com.br`,
                address: `Av. Contadores, ${Math.floor(Math.random() * 1000) + 1}`,
                city: location.city,
                state: location.state,
                houseNumber: String(Math.floor(Math.random() * 1000) + 1),
                neighborhood: `Centro`,
                zipCode: `${Math.floor(Math.random() * 90000) + 10000}-${Math.floor(Math.random() * 900) + 100}`,
                complement: `Sala ${Math.floor(Math.random() * 100) + 1}`,
                ie: `${Math.floor(Math.random() * 900000000) + 100000000}`,
                cpf: "",
                type: "PESSOA_JURIDICA"
            }
        })
        contabilidades.push(contab)
    }
    console.log(`✓ ${contabilidades.length} contabilidades criadas`)

    console.log("👥 Criando 40 clientes...")
    const clients = []

    // 2 clientes PF (5%)
    for (let i = 0; i < 2; i++) {
        const location = CITIES[Math.floor(Math.random() * CITIES.length)]
        
        let certDate: Date | null = null
        let certType: string | null = null
        const certRand = Math.random()
        if (certRand < 0.33) {
            certDate = new Date(now.getTime() - Math.random() * 90 * 24 * 60 * 60 * 1000)
            certType = "A1"
        } else if (certRand < 0.66) {
            certDate = new Date(now.getTime() + Math.random() * 30 * 24 * 60 * 60 * 1000)
            certType = "A1"
        } else {
            certDate = new Date(now.getTime() + (30 + Math.random() * 335) * 24 * 60 * 60 * 1000)
            certType = "A1"
        }

        // Vincular à primeira contabilidade (que terá 10 clientes no total)
        const contabilityId = i === 0 ? contabilidades[0].id : (Math.random() < 0.8 ? contabilidades[Math.floor(Math.random() * contabilidades.length)].id : undefined)
        
        const client = await prisma.clients.create({
            data: {
                id: crypto.randomUUID(),
                name: PERSON_NAMES[i],
                type: "PESSOA_FISICA",
                cpf: generateCPF(),
                address: `Rua ${i + 1}, ${Math.floor(Math.random() * 1000) + 1}`,
                city: location.city,
                state: location.state,
                houseNumber: String(Math.floor(Math.random() * 1000) + 1),
                neighborhood: `Bairro ${i + 1}`,
                zipCode: `${Math.floor(Math.random() * 90000) + 10000}-${Math.floor(Math.random() * 900) + 100}`,
                complement: "",
                hasContract: true,
                contractType: Math.random() > 0.5 ? "MENSAL" : "ANUAL",
                supportReleased: Math.random() > 0.2,
                certificateType: certType,
                certificateExpiresDate: certDate,
                contabilityId: contabilityId,
            }
        })
        clients.push(client)

        await prisma.clientContact.create({
            data: {
                clientId: client.id,
                name: client.name,
                phone: generatePhone(),
                email: `${client.name.toLowerCase().replace(" ", ".")}@email.com`,
                role: "Proprietário",
                isDefault: true
            }
        })
    }

    // 38 clientes PJ (95%)
    for (let i = 0; i < 38; i++) {
        const location = CITIES[Math.floor(Math.random() * CITIES.length)]
        
        let certDate: Date | null = null
        let certType: string | null = null
        const certRand = Math.random()
        if (certRand < 0.33) {
            certDate = new Date(now.getTime() - Math.random() * 90 * 24 * 60 * 60 * 1000)
            certType = Math.random() > 0.5 ? "A1" : "A3"
        } else if (certRand < 0.66) {
            certDate = new Date(now.getTime() + Math.random() * 30 * 24 * 60 * 60 * 1000)
            certType = Math.random() > 0.5 ? "A1" : "A3"
        } else {
            certDate = new Date(now.getTime() + (30 + Math.random() * 335) * 24 * 60 * 60 * 1000)
            certType = Math.random() > 0.5 ? "A1" : "A3"
        }

        // Garantir que os primeiros 9 clientes PJ vão para a primeira contabilidade (total de 10 com o PF)
        const contabilityId = i < 9 ? contabilidades[0].id : (Math.random() < 0.8 ? contabilidades[Math.floor(Math.random() * contabilidades.length)].id : undefined)
        
        const client = await prisma.clients.create({
            data: {
                id: crypto.randomUUID(),
                name: COMPANY_NAMES[i],
                type: "PESSOA_JURIDICA",
                cnpj: generateCNPJ(),
                ie: `${Math.floor(Math.random() * 900000000) + 100000000}`,
                state: location.state,
                cnae: `${Math.floor(Math.random() * 9000) + 1000}-${Math.floor(Math.random() * 9) + 1}/00`,
                businessSector: BUSINESS_SECTORS[Math.floor(Math.random() * BUSINESS_SECTORS.length)],
                address: `Rua ${i + 1}, ${Math.floor(Math.random() * 1000) + 1}`,
                city: location.city,
                houseNumber: String(Math.floor(Math.random() * 1000) + 1),
                neighborhood: `Bairro ${i + 1}`,
                zipCode: `${Math.floor(Math.random() * 90000) + 10000}-${Math.floor(Math.random() * 900) + 100}`,
                complement: "",
                hasContract: true,
                contractType: ["MENSAL", "ANUAL", "AVULSO", "CANCELADO"][Math.floor(Math.random() * 4)] as any,
                supportReleased: Math.random() > 0.2,
                certificateType: certType,
                certificateExpiresDate: certDate,
                ownerName: `Proprietário ${i + 1}`,
                ownerCpf: generateCPF(),
                ownerPhone: generatePhone(),
                ownerEmail: `proprietario${i + 1}@empresa.com`,
                contabilityId: contabilityId,
            }
        })
        clients.push(client)

        await prisma.clientContact.create({
            data: {
                clientId: client.id,
                name: `Contato ${i + 1}`,
                phone: generatePhone(),
                email: `contato${i + 1}@empresa.com`,
                role: "Financeiro",
                isDefault: true
            }
        })
    }
    console.log(`✓ ${clients.length} clientes criados (2 PF, 38 PJ)`)

    // Criar seriais de produtos
    console.log("🔢 Criando seriais de produtos...")
    let serialCount = 0
    for (const client of clients) {
        if (Math.random() < 0.7) {
            const productId = PRODUCT_IDS[Math.floor(Math.random() * PRODUCT_IDS.length)]
            
            let serialDate: Date
            const serialRand = Math.random()
            if (serialRand < 0.33) {
                serialDate = new Date(now.getTime() - Math.random() * 90 * 24 * 60 * 60 * 1000)
            } else if (serialRand < 0.66) {
                serialDate = new Date(now.getTime() + Math.random() * 45 * 24 * 60 * 60 * 1000)
            } else {
                serialDate = new Date(now.getTime() + (45 + Math.random() * 320) * 24 * 60 * 60 * 1000)
            }

            await prisma.clientProductSerial.create({
                data: {
                    clientId: client.id,
                    productId: productId,
                    serial: `SN-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
                    expiresAt: serialDate
                }
            })
            serialCount++
        }
    }
    console.log(`✓ ${serialCount} seriais criados`)

    // Buscar usuários
    const users = await prisma.user.findMany({ take: 5 })
    if (users.length === 0) {
        console.log("⚠️  Nenhum usuário encontrado. Tickets não serão criados.")
        return
    }

    // Criar 80 tickets
    console.log("🎫 Criando 80 tickets...")
    const clientWithManyTickets = clients[Math.floor(Math.random() * clients.length)]
    
    for (let i = 0; i < 80; i++) {
        const client = i < 10 ? clientWithManyTickets : clients[Math.floor(Math.random() * clients.length)]
        const assignedUser = users[Math.floor(Math.random() * users.length)]
        
        let createdAt: Date
        const monthRand = Math.random()
        if (monthRand < 0.33) {
            createdAt = randomDate(dec2024, jan2025)
        } else if (monthRand < 0.66) {
            createdAt = randomDate(jan2025, feb2025)
        } else {
            createdAt = randomDate(feb2025, mar2025)
        }

        const isClosed = Math.random() < 0.1
        const status = isClosed ? "CLOSED" : ["NOVO", "PENDING_CLIENT", "PENDING_EMPRESS", "IN_PROGRESS"][Math.floor(Math.random() * 4)]
        
        await prisma.tickets.create({
            data: {
                clientId: client.id,
                assignedToId: assignedUser.id,
                ticketStatus: status as any,
                ticketPriority: ["LOW", "MEDIUM", "HIGH"][Math.floor(Math.random() * 3)] as any,
                ticketType: ["SUPPORT", "SALES", "FINANCE", "MAINTENCE"][Math.floor(Math.random() * 4)] as any,
                ticketDescription: TICKET_DESCRIPTIONS[Math.floor(Math.random() * TICKET_DESCRIPTIONS.length)],
                ticketResolutionDate: isClosed ? new Date(createdAt.getTime() + Math.random() * 7 * 24 * 60 * 60 * 1000) : null,
                createdAt: createdAt
            }
        })
    }
    console.log(`✓ 80 tickets criados`)
    console.log(`  - Cliente "${clientWithManyTickets.name}" tem 10 tickets`)

    console.log("\n✅ Seed concluído!")
    console.log(`\n📊 Resumo:`)
    console.log(`  - 40 clientes (2 PF, 38 PJ)`)
    console.log(`  - ${serialCount} seriais de produtos`)
    console.log(`  - 80 tickets (distribuídos entre dez/jan/fev, ~8 fechados)`)
}

seedData()
    .catch((e) => {
        console.error("❌ Erro:", e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
