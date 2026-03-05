/*
  Warnings:

  - You are about to drop the column `clientId` on the `contability` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "contability" DROP CONSTRAINT "contability_clientId_fkey";

-- AlterTable
ALTER TABLE "clients" ADD COLUMN     "contabilityId" TEXT;

-- AlterTable
ALTER TABLE "contability" DROP COLUMN "clientId",
ADD COLUMN     "name" TEXT;

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_contabilityId_fkey" FOREIGN KEY ("contabilityId") REFERENCES "contability"("id") ON DELETE SET NULL ON UPDATE CASCADE;
