import { prisma } from "../app/utils/prisma";
import { REAL_CONTABILITIES } from "./real-contabilities";

async function main() {
  for (const ct of REAL_CONTABILITIES) {
    const existingContability = await prisma.contability.findFirst({
      where: {
        OR: [
          ...(ct.email ? [{ email: ct.email }] : []),
          ...(ct.name ? [{ name: ct.name }] : []),
        ],
      },
      select: { id: true },
    });

    const contability = existingContability
      ? await prisma.contability.update({
          where: { id: existingContability.id },
          data: {
            name: ct.name,
            phone: ct.phone,
            email: ct.email,
            address: ct.address,
            city: ct.city,
            houseNumber: ct.houseNumber,
            neighborhood: ct.neighborhood,
            zipCode: ct.zipCode,
            complement: ct.complement,
            state: ct.state,
            cnpj: ct.cnpj,
            cpf: ct.cpf,
            ie: ct.ie,
            type: ct.type === "PF" ? "PESSOA_FISICA" : "PESSOA_JURIDICA",
          },
        })
      : await prisma.contability.create({
          data: {
            name: ct.name,
            phone: ct.phone,
            email: ct.email,
            address: ct.address,
            city: ct.city,
            houseNumber: ct.houseNumber,
            neighborhood: ct.neighborhood,
            zipCode: ct.zipCode,
            complement: ct.complement,
            state: ct.state,
            cnpj: ct.cnpj,
            cpf: ct.cpf,
            ie: ct.ie,
            type: ct.type === "PF" ? "PESSOA_FISICA" : "PESSOA_JURIDICA",
          },
        });

    await prisma.contabilityContact.deleteMany({
      where: { contabilityId: contability.id },
    });

    if (ct.contacts.length > 0) {
      await prisma.contabilityContact.createMany({
        data: ct.contacts.map((contact) => ({
          contabilityId: contability.id,
          name: contact.name,
          email: contact.email ?? null,
          phone: contact.phone ?? null,
          isDefault: contact.isDefault,
        })),
      });
    }
  }

  console.log(`${REAL_CONTABILITIES.length} contabilidades reais processadas.`);
  await prisma.$disconnect();
  console.log("Seed de contabilidades finalizado com sucesso!");
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
