/*
  Warnings:

  - The `ticketId` column on the `attachment` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `tickets` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `tickets` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Changed the type of `ticketId` on the `apontamento` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `ticketId` on the `ticket_comment` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterEnum
ALTER TYPE "Ticket_Status" ADD VALUE 'CANCELLED';

-- DropForeignKey
ALTER TABLE "apontamento" DROP CONSTRAINT "apontamento_ticketId_fkey";

-- DropForeignKey
ALTER TABLE "attachment" DROP CONSTRAINT "attachment_ticketId_fkey";

-- DropForeignKey
ALTER TABLE "ticket_comment" DROP CONSTRAINT "ticket_comment_ticketId_fkey";

-- AlterTable
ALTER TABLE "apontamento" DROP COLUMN "ticketId",
ADD COLUMN     "ticketId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "attachment" DROP COLUMN "ticketId",
ADD COLUMN     "ticketId" INTEGER;

-- AlterTable
ALTER TABLE "ticket_comment" DROP COLUMN "ticketId",
ADD COLUMN     "ticketId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "tickets" DROP CONSTRAINT "tickets_pkey",
ADD COLUMN     "cancelReason" TEXT,
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "tickets_pkey" PRIMARY KEY ("id");

-- CreateIndex
CREATE INDEX "attachment_ticketId_idx" ON "attachment"("ticketId");

-- AddForeignKey
ALTER TABLE "apontamento" ADD CONSTRAINT "apontamento_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_comment" ADD CONSTRAINT "ticket_comment_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachment" ADD CONSTRAINT "attachment_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
