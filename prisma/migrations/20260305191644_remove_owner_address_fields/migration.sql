/*
  Warnings:

  - You are about to drop the column `ownerAddress` on the `clients` table. All the data in the column will be lost.
  - You are about to drop the column `ownerCity` on the `clients` table. All the data in the column will be lost.
  - You are about to drop the column `ownerNeighborhood` on the `clients` table. All the data in the column will be lost.
  - You are about to drop the column `ownerState` on the `clients` table. All the data in the column will be lost.
  - You are about to drop the column `ownerZipCode` on the `clients` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "clients" DROP COLUMN "ownerAddress",
DROP COLUMN "ownerCity",
DROP COLUMN "ownerNeighborhood",
DROP COLUMN "ownerState",
DROP COLUMN "ownerZipCode";
