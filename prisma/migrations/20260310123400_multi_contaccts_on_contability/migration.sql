-- CreateTable
CREATE TABLE "contability_contact" (
    "id" TEXT NOT NULL,
    "contabilityId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "role" TEXT,
    "bestContactTime" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contability_contact_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "contability_contact_contabilityId_idx" ON "contability_contact"("contabilityId");

-- AddForeignKey
ALTER TABLE "contability_contact" ADD CONSTRAINT "contability_contact_contabilityId_fkey" FOREIGN KEY ("contabilityId") REFERENCES "contability"("id") ON DELETE CASCADE ON UPDATE CASCADE;
