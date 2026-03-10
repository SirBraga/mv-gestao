-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "Ticket_Schedule_Type" ADD VALUE 'CONSULTORIA';
ALTER TYPE "Ticket_Schedule_Type" ADD VALUE 'IMPLANTACAO';
ALTER TYPE "Ticket_Schedule_Type" ADD VALUE 'PARAMETRIZACAO';
ALTER TYPE "Ticket_Schedule_Type" ADD VALUE 'REUNIAO_ALINHAMENTO';
ALTER TYPE "Ticket_Schedule_Type" ADD VALUE 'VISITA_TECNICA';
