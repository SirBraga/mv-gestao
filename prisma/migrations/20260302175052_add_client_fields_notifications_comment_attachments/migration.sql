-- CreateEnum
CREATE TYPE "ContractType" AS ENUM ('MENSAL', 'TRIMESTRAL', 'ANUAL');

-- CreateEnum
CREATE TYPE "BlockReason" AS ENUM ('CONTRATO_CANCELADO', 'INADIMPLENCIA', 'SOLICITACAO_CLIENTE', 'OUTROS');

-- AlterTable
ALTER TABLE "attachment" ADD COLUMN     "commentId" TEXT;

-- AlterTable
ALTER TABLE "clients" ADD COLUMN     "blockReason" "BlockReason",
ADD COLUMN     "codigoCSC" TEXT,
ADD COLUMN     "contractType" "ContractType",
ADD COLUMN     "photoUrl" TEXT,
ADD COLUMN     "state" TEXT,
ADD COLUMN     "tokenCSC" TEXT;

-- CreateTable
CREATE TABLE "notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'TICKET_ASSIGNED',
    "link" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notification_userId_idx" ON "notification"("userId");

-- CreateIndex
CREATE INDEX "notification_userId_read_idx" ON "notification"("userId", "read");

-- CreateIndex
CREATE INDEX "attachment_commentId_idx" ON "attachment"("commentId");

-- AddForeignKey
ALTER TABLE "attachment" ADD CONSTRAINT "attachment_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "ticket_comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification" ADD CONSTRAINT "notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
