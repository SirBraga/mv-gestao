import { auth } from "../app/utils/auth";
import { prisma } from "../app/utils/prisma";

async function main() {
  // --- Admin user ---
  const email = "pedrobraga2016@gmail.com";
  const existing = await prisma.user.findUnique({ where: { email } });

  if (!existing) {
    await auth.api.signUpEmail({
      body: {
        name: "Pedro Braga",
        email,
        password: "Kratos@007",
      },
    });

    await prisma.user.update({
      where: { email },
      data: { role: "ADMIN" },
    });

    console.log("Usuário admin criado com sucesso:", email);
  } else {
    console.log("Usuário admin já existe, pulando criação.");
  }

  // --- Clients ---
  const clientsData = [
    {
      id: "9462",
      name: "João Silva",
      cpf: "123.456.789-00",
      type: "PESSOA_FISICA" as const,
      address: "Rua das Flores, 123",
      city: "São Paulo",
      houseNumber: "123",
      neighborhood: "Centro",
      zipCode: "01001-000",
      complement: "Apto 45",
      hasContract: true,
      supportReleased: true,
      ownerName: "João Silva",
      ownerPhone: "(11) 98765-4321",
      ownerEmail: "joao.silva@email.com",
      ownerCpf: "123.456.789-00",
    },
    {
      id: "9374",
      name: "Empresa ABC Ltda",
      cnpj: "12.345.678/0001-99",
      type: "PESSOA_JURIDICA" as const,
      address: "Av. Paulista, 1000",
      city: "São Paulo",
      houseNumber: "1000",
      neighborhood: "Bela Vista",
      zipCode: "01310-100",
      complement: "Sala 501",
      cnae: "6201-5/01",
      hasContract: true,
      supportReleased: true,
      ownerName: "Carlos Ferreira",
      ownerPhone: "(11) 3344-5566",
      ownerEmail: "carlos@empresaabc.com.br",
    },
    {
      id: "9359",
      name: "Maria Oliveira",
      cpf: "987.654.321-11",
      type: "PESSOA_FISICA" as const,
      address: "Rua do Comércio, 456",
      city: "Rio de Janeiro",
      houseNumber: "456",
      neighborhood: "Copacabana",
      zipCode: "22041-080",
      complement: "",
      hasContract: false,
      supportReleased: false,
      ownerName: "Maria Oliveira",
      ownerPhone: "(21) 99887-7665",
      ownerEmail: "maria.oliveira@email.com",
      ownerCpf: "987.654.321-11",
    },
    {
      id: "9261",
      name: "Tech Solutions ME",
      cnpj: "45.678.901/0001-23",
      type: "PESSOA_JURIDICA" as const,
      address: "Rua da Tecnologia, 789",
      city: "Belo Horizonte",
      houseNumber: "789",
      neighborhood: "Savassi",
      zipCode: "30130-000",
      complement: "Sala 12",
      cnae: "6202-3/00",
      hasContract: true,
      supportReleased: true,
      ownerName: "Ricardo Santos",
      ownerPhone: "(31) 3456-7890",
      ownerEmail: "ricardo@techsolutions.com.br",
    },
    {
      id: "9151",
      name: "Carlos Mendes",
      cpf: "456.789.012-33",
      type: "PESSOA_FISICA" as const,
      address: "Av. Brasil, 321",
      city: "Curitiba",
      houseNumber: "321",
      neighborhood: "Batel",
      zipCode: "80420-000",
      complement: "Casa",
      hasContract: true,
      supportReleased: true,
      ownerName: "Carlos Mendes",
      ownerPhone: "(41) 99876-5432",
      ownerEmail: "carlos.mendes@email.com",
      ownerCpf: "456.789.012-33",
    },
    {
      id: "8861",
      name: "Distribuidora Norte Ltda",
      cnpj: "67.890.123/0001-45",
      type: "PESSOA_JURIDICA" as const,
      address: "Rua Industrial, 555",
      city: "Porto Alegre",
      houseNumber: "555",
      neighborhood: "Navegantes",
      zipCode: "90240-000",
      complement: "Galpão 3",
      cnae: "4639-7/01",
      hasContract: true,
      supportReleased: true,
      ownerName: "Fernando Lima",
      ownerPhone: "(51) 3210-9876",
      ownerEmail: "fernando@distnorte.com.br",
    },
    {
      id: "8829",
      name: "Ana Paula Costa",
      cpf: "789.012.345-66",
      type: "PESSOA_FISICA" as const,
      address: "Quadra 5, Lote 10",
      city: "Brasília",
      houseNumber: "10",
      neighborhood: "Asa Sul",
      zipCode: "70070-000",
      complement: "Bloco B",
      hasContract: true,
      supportReleased: true,
      ownerName: "Ana Paula Costa",
      ownerPhone: "(61) 98765-1234",
      ownerEmail: "ana.costa@email.com",
      ownerCpf: "789.012.345-66",
    },
    {
      id: "8811",
      name: "Logística Express SA",
      cnpj: "89.012.345/0001-67",
      type: "PESSOA_JURIDICA" as const,
      address: "Rod. BR-101, Km 45",
      city: "Salvador",
      houseNumber: "S/N",
      neighborhood: "Distrito Industrial",
      zipCode: "41500-000",
      complement: "Galpão 7",
      cnae: "5212-5/00",
      hasContract: true,
      supportReleased: false,
      ownerName: "Marcos Pereira",
      ownerPhone: "(71) 3456-0987",
      ownerEmail: "marcos@logexpress.com.br",
    },
    {
      id: "8013",
      name: "Roberto Almeida",
      cpf: "012.345.678-99",
      type: "PESSOA_FISICA" as const,
      address: "Rua Boa Vista, 88",
      city: "Recife",
      houseNumber: "88",
      neighborhood: "Boa Viagem",
      zipCode: "51020-000",
      complement: "",
      hasContract: false,
      supportReleased: false,
      ownerName: "Roberto Almeida",
      ownerPhone: "(81) 99654-3210",
      ownerEmail: "roberto.almeida@email.com",
      ownerCpf: "012.345.678-99",
    },
    {
      id: "7791",
      name: "Padaria Central ME",
      cnpj: "23.456.789/0001-01",
      type: "PESSOA_JURIDICA" as const,
      address: "Rua Principal, 100",
      city: "Belém",
      houseNumber: "100",
      neighborhood: "Centro",
      zipCode: "66010-000",
      complement: "Loja 1",
      cnae: "1091-1/02",
      hasContract: true,
      supportReleased: false,
      ownerName: "Antônio Souza",
      ownerPhone: "(91) 3321-6540",
      ownerEmail: "antonio@padariacentral.com.br",
    },
  ];

  for (const c of clientsData) {
    await prisma.clients.upsert({
      where: { id: c.id },
      update: {},
      create: c,
    });
  }
  console.log(`${clientsData.length} clientes criados/atualizados.`);

  // --- Contability ---
  const contabilityData = [
    {
      clientId: "9462",
      phone: "(11) 98765-4321",
      email: "joao.silva@email.com",
      address: "Rua das Flores, 123",
      city: "São Paulo",
      houseNumber: "123",
      neighborhood: "Centro",
      zipCode: "01001-000",
      complement: "Apto 45",
      state: "SP",
      cnpj: "",
      cpf: "123.456.789-00",
      ie: "",
      type: "PESSOA_FISICA" as const,
    },
    {
      clientId: "9374",
      phone: "(11) 3344-5566",
      email: "contabil@empresaabc.com.br",
      address: "Av. Paulista, 1000",
      city: "São Paulo",
      houseNumber: "1000",
      neighborhood: "Bela Vista",
      zipCode: "01310-100",
      complement: "Sala 501",
      state: "SP",
      cnpj: "12.345.678/0001-99",
      cpf: "",
      ie: "123.456.789.012",
      type: "PESSOA_JURIDICA" as const,
    },
    {
      clientId: "9261",
      phone: "(31) 3456-7890",
      email: "financeiro@techsolutions.com.br",
      address: "Rua da Tecnologia, 789",
      city: "Belo Horizonte",
      houseNumber: "789",
      neighborhood: "Savassi",
      zipCode: "30130-000",
      complement: "Sala 12",
      state: "MG",
      cnpj: "45.678.901/0001-23",
      cpf: "",
      ie: "456.789.012.345",
      type: "PESSOA_JURIDICA" as const,
    },
    {
      clientId: "8861",
      phone: "(51) 3210-9876",
      email: "contabil@distnorte.com.br",
      address: "Rua Industrial, 555",
      city: "Porto Alegre",
      houseNumber: "555",
      neighborhood: "Navegantes",
      zipCode: "90240-000",
      complement: "Galpão 3",
      state: "RS",
      cnpj: "67.890.123/0001-45",
      cpf: "",
      ie: "678.901.234.567",
      type: "PESSOA_JURIDICA" as const,
    },
    {
      clientId: "8811",
      phone: "(71) 3456-0987",
      email: "financeiro@logexpress.com.br",
      address: "Rod. BR-101, Km 45",
      city: "Salvador",
      houseNumber: "S/N",
      neighborhood: "Distrito Industrial",
      zipCode: "41500-000",
      complement: "Galpão 7",
      state: "BA",
      cnpj: "89.012.345/0001-67",
      cpf: "",
      ie: "890.123.456.789",
      type: "PESSOA_JURIDICA" as const,
    },
    {
      clientId: "7791",
      phone: "(91) 3321-6540",
      email: "contabil@padariacentral.com.br",
      address: "Rua Principal, 100",
      city: "Belém",
      houseNumber: "100",
      neighborhood: "Centro",
      zipCode: "66010-000",
      complement: "Loja 1",
      state: "PA",
      cnpj: "23.456.789/0001-01",
      cpf: "",
      ie: "234.567.890.123",
      type: "PESSOA_JURIDICA" as const,
    },
  ];

  for (const ct of contabilityData) {
    await prisma.contability.create({ data: ct });
  }
  console.log(`${contabilityData.length} registros de contabilidade criados.`);

  // --- Tickets ---
  const adminUser = await prisma.user.findUnique({ where: { email } });
  const adminId = adminUser!.id;

  const ticketsData = [
    {
      clientId: "9462",
      ticketStatus: "NOVO" as const,
      ticketPriority: "HIGH" as const,
      ticketType: "SUPPORT" as const,
      ticketDescription: "Sistema apresentando lentidão ao gerar relatórios mensais",
      assignedToId: adminId,
    },
    {
      clientId: "9374",
      ticketStatus: "PENDING_CLIENT" as const,
      ticketPriority: "MEDIUM" as const,
      ticketType: "SUPPORT" as const,
      ticketDescription: "Erro ao importar notas fiscais no módulo contábil",
    },
    {
      clientId: "9359",
      ticketStatus: "NOVO" as const,
      ticketPriority: "HIGH" as const,
      ticketType: "FINANCE" as const,
      ticketDescription: "Divergência nos valores de faturamento do mês de janeiro",
    },
    {
      clientId: "9261",
      ticketStatus: "IN_PROGRESS" as const,
      ticketPriority: "MEDIUM" as const,
      ticketType: "MAINTENCE" as const,
      ticketDescription: "Atualização do módulo de estoque para nova versão",
      assignedToId: adminId,
    },
    {
      clientId: "9151",
      ticketStatus: "CLOSED" as const,
      ticketPriority: "LOW" as const,
      ticketType: "SUPPORT" as const,
      ticketDescription: "Dúvida sobre como cadastrar novo produto no sistema",
      ticketResolutionDate: new Date("2026-02-10"),
      assignedToId: adminId,
    },
    {
      clientId: "8861",
      ticketStatus: "NOVO" as const,
      ticketPriority: "HIGH" as const,
      ticketType: "SALES" as const,
      ticketDescription: "Solicitação de proposta para módulo de logística",
    },
    {
      clientId: "8829",
      ticketStatus: "PENDING_EMPRESS" as const,
      ticketPriority: "MEDIUM" as const,
      ticketType: "SUPPORT" as const,
      ticketDescription: "Problema na emissão de boletos bancários",
      assignedToId: adminId,
    },
    {
      clientId: "8811",
      ticketStatus: "IN_PROGRESS" as const,
      ticketPriority: "HIGH" as const,
      ticketType: "MAINTENCE" as const,
      ticketDescription: "Migração de dados do sistema legado para o novo ERP",
    },
    {
      clientId: "8013",
      ticketStatus: "CLOSED" as const,
      ticketPriority: "LOW" as const,
      ticketType: "SUPPORT" as const,
      ticketDescription: "Treinamento sobre funcionalidades do dashboard",
      ticketResolutionDate: new Date("2026-02-15"),
      assignedToId: adminId,
    },
    {
      clientId: "7791",
      ticketStatus: "NOVO" as const,
      ticketPriority: "MEDIUM" as const,
      ticketType: "FINANCE" as const,
      ticketDescription: "Configuração de integração com gateway de pagamento",
    },
  ];

  const createdTickets = [];
  for (const t of ticketsData) {
    const ticket = await prisma.tickets.create({ data: t });
    createdTickets.push(ticket);
  }
  console.log(`${ticketsData.length} tickets criados.`);

  // --- Apontamentos ---
  const apontamentosData = [
    {
      ticketId: createdTickets[3].id, // Atualização módulo estoque - IN_PROGRESS
      userId: adminId,
      description: "Análise inicial do módulo de estoque, identificação de dependências para atualização",
      category: "DESENVOLVIMENTO" as const,
      duration: 120,
      date: new Date("2026-02-01T10:00:00Z"),
    },
    {
      ticketId: createdTickets[3].id,
      userId: adminId,
      description: "Backup do banco de dados e preparação do ambiente de testes",
      category: "DESENVOLVIMENTO" as const,
      duration: 60,
      date: new Date("2026-02-02T14:00:00Z"),
    },
    {
      ticketId: createdTickets[4].id, // Dúvida cadastro produto - CLOSED
      userId: adminId,
      description: "Treinamento remoto sobre cadastro de produtos no sistema",
      category: "TREINAMENTO" as const,
      duration: 45,
      date: new Date("2026-02-08T09:00:00Z"),
      statusChange: "CLOSED" as const,
    },
    {
      ticketId: createdTickets[6].id, // Problema boletos - PENDING_EMPRESS
      userId: adminId,
      description: "Investigação do erro na geração de boletos, problema identificado no módulo bancário",
      category: "PROBLEMA_RESOLVIDO" as const,
      duration: 90,
      date: new Date("2026-02-11T11:00:00Z"),
    },
    {
      ticketId: createdTickets[6].id,
      userId: adminId,
      description: "Reunião com equipe financeira para alinhar correção do módulo de boletos",
      category: "REUNIAO" as const,
      duration: 30,
      date: new Date("2026-02-12T15:00:00Z"),
      statusChange: "PENDING_EMPRESS" as const,
    },
    {
      ticketId: createdTickets[8].id, // Treinamento dashboard - CLOSED
      userId: adminId,
      description: "Sessão de treinamento sobre funcionalidades do dashboard com o cliente",
      category: "TREINAMENTO" as const,
      duration: 60,
      date: new Date("2026-02-13T10:00:00Z"),
    },
    {
      ticketId: createdTickets[8].id,
      userId: adminId,
      description: "Tira-dúvidas final e validação com o cliente",
      category: "TIRA_DUVIDAS" as const,
      duration: 30,
      date: new Date("2026-02-15T16:00:00Z"),
      statusChange: "CLOSED" as const,
    },
    {
      ticketId: createdTickets[0].id, // Lentidão relatórios - NOVO
      userId: adminId,
      description: "Análise preliminar de performance nos relatórios mensais",
      category: "TIRA_DUVIDAS" as const,
      duration: 45,
      date: new Date("2026-01-16T09:00:00Z"),
    },
  ];

  for (const a of apontamentosData) {
    await prisma.apontamento.create({ data: a });
  }
  console.log(`${apontamentosData.length} apontamentos criados.`);

  await prisma.$disconnect();
  console.log("Seed finalizado com sucesso!");
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
