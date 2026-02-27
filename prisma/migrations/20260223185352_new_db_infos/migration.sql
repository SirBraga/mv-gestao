-- CreateTable
CREATE TABLE "contability" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "houseNumber" TEXT NOT NULL,
    "neighborhood" TEXT NOT NULL,
    "zipCode" TEXT NOT NULL,
    "complement" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "cnpj" TEXT NOT NULL,
    "cpf" TEXT NOT NULL,
    "ie" TEXT NOT NULL,
    "type" "CType" DEFAULT 'PESSOA_JURIDICA',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contability_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "contability" ADD CONSTRAINT "contability_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;
