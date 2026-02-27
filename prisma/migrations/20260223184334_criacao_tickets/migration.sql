-- CreateEnum
CREATE TYPE "CType" AS ENUM ('PESSOA_FISICA', 'PESSOA_JURIDICA');

-- CreateEnum
CREATE TYPE "Ticket_Status" AS ENUM ('OPEN', 'PENDING_CLIENT', 'PENDING_EMPRESS', 'IN_PROGRESS', 'CLOSED');

-- CreateEnum
CREATE TYPE "Ticket_Priority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "Ticket_Type" AS ENUM ('SUPPORT', 'SALES', 'FINANCE', 'MAINTENCE');

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'MODERATOR';

-- CreateTable
CREATE TABLE "clients" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cnpj" TEXT,
    "cpf" TEXT,
    "ie" TEXT,
    "aditionalInfo" TEXT,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "houseNumber" TEXT NOT NULL,
    "neighborhood" TEXT NOT NULL,
    "zipCode" TEXT NOT NULL,
    "complement" TEXT NOT NULL,
    "cnae" TEXT,
    "type" "CType" DEFAULT 'PESSOA_JURIDICA',
    "hasContract" BOOLEAN,
    "supportReleased" BOOLEAN,
    "ownerName" TEXT,
    "ownerAddress" TEXT,
    "ownerPhone" TEXT,
    "ownerEmail" TEXT,
    "ownerCpf" TEXT,
    "ownerNeighborhood" TEXT,
    "ownerCity" TEXT,
    "ownerState" TEXT,
    "ownerZipCode" TEXT,
    "certificateExpiresDate" TIMESTAMP(3),
    "certificateType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tickets" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "ticketStatus" "Ticket_Status" DEFAULT 'OPEN',
    "ticketPriority" "Ticket_Priority" DEFAULT 'MEDIUM',
    "ticketType" "Ticket_Type" DEFAULT 'SUPPORT',
    "ticketDescription" TEXT NOT NULL,
    "ticketResolutionDate" TIMESTAMP(3),
    "reopenCount" INTEGER NOT NULL DEFAULT 0,
    "reopenReason" TEXT,
    "reopenDate" TIMESTAMP(3),
    "reopenById" TEXT,
    "pipelineId" TEXT NOT NULL,
    "assignedToId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pipeline" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pipeline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "clientId" TEXT,
    "image" TEXT,
    "category" TEXT,
    "status" TEXT,
    "supportContact" TEXT,
    "price" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Tickets" ADD CONSTRAINT "Tickets_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tickets" ADD CONSTRAINT "Tickets_pipelineId_fkey" FOREIGN KEY ("pipelineId") REFERENCES "pipeline"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tickets" ADD CONSTRAINT "Tickets_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
