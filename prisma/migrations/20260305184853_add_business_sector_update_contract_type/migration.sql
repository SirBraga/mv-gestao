/*
  Warnings:

  - The values [TRIMESTRAL] on the enum `ContractType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "ContractType_new" AS ENUM ('MENSAL', 'ANUAL', 'AVULSO', 'CANCELADO');
ALTER TABLE "clients" ALTER COLUMN "contractType" TYPE "ContractType_new" USING ("contractType"::text::"ContractType_new");
ALTER TYPE "ContractType" RENAME TO "ContractType_old";
ALTER TYPE "ContractType_new" RENAME TO "ContractType";
DROP TYPE "public"."ContractType_old";
COMMIT;

-- AlterTable
ALTER TABLE "clients" ADD COLUMN     "businessSector" TEXT;
