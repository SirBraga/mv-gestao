-- DropForeignKey
ALTER TABLE "Tickets" DROP CONSTRAINT IF EXISTS "Tickets_assignedToId_fkey";
ALTER TABLE "Tickets" DROP CONSTRAINT IF EXISTS "Tickets_clientId_fkey";
ALTER TABLE "Tickets" DROP CONSTRAINT IF EXISTS "Tickets_pipelineId_fkey";

-- DropTable
DROP TABLE IF EXISTS "Tickets";
DROP TABLE IF EXISTS "pipeline";

-- CreateEnum
CREATE TYPE "Apontamento_Category" AS ENUM ('PROBLEMA_RESOLVIDO', 'TREINAMENTO', 'REUNIAO', 'TIRA_DUVIDAS', 'DESENVOLVIMENTO');

-- AlterEnum: rename OPEN to NOVO
CREATE TYPE "Ticket_Status_new" AS ENUM ('NOVO', 'PENDING_CLIENT', 'PENDING_EMPRESS', 'IN_PROGRESS', 'CLOSED');
ALTER TYPE "Ticket_Status" RENAME TO "Ticket_Status_old";
ALTER TYPE "Ticket_Status_new" RENAME TO "Ticket_Status";
DROP TYPE "Ticket_Status_old";

-- CreateTable
CREATE TABLE "tickets" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "ticketStatus" "Ticket_Status" DEFAULT 'NOVO',
    "ticketPriority" "Ticket_Priority" DEFAULT 'MEDIUM',
    "ticketType" "Ticket_Type" DEFAULT 'SUPPORT',
    "ticketDescription" TEXT NOT NULL,
    "ticketResolutionDate" TIMESTAMP(3),
    "reopenCount" INTEGER NOT NULL DEFAULT 0,
    "reopenReason" TEXT,
    "reopenDate" TIMESTAMP(3),
    "reopenById" TEXT,
    "assignedToId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "apontamento" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "Apontamento_Category" NOT NULL DEFAULT 'PROBLEMA_RESOLVIDO',
    "duration" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "statusChange" "Ticket_Status",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "apontamento_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "apontamento" ADD CONSTRAINT "apontamento_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "apontamento" ADD CONSTRAINT "apontamento_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
