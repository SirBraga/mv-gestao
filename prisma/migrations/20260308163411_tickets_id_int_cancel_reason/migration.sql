-- CreateEnum
CREATE TYPE "Ticket_Schedule_Type" AS ENUM ('TREINAMENTO', 'TIRA_DUVIDAS');

-- CreateEnum
CREATE TYPE "Ticket_Schedule_Format" AS ENUM ('PRESENCIAL', 'ONLINE');

-- CreateTable
CREATE TABLE "ticket_schedule" (
    "id" TEXT NOT NULL,
    "ticketId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "Ticket_Schedule_Type" NOT NULL,
    "format" "Ticket_Schedule_Format" NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "durationMinutes" INTEGER,
    "location" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ticket_schedule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ticket_schedule_ticketId_scheduledAt_idx" ON "ticket_schedule"("ticketId", "scheduledAt");

-- AddForeignKey
ALTER TABLE "ticket_schedule" ADD CONSTRAINT "ticket_schedule_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
