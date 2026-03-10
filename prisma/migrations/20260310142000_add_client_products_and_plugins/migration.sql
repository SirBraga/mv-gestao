-- CreateEnum
CREATE TYPE "InstallationType" AS ENUM ('LOCAL', 'SERVIDOR', 'ONLINE');

-- CreateTable
CREATE TABLE "product_plugins" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT,
    "priceMonthly" DOUBLE PRECISION,
    "priceQuarterly" DOUBLE PRECISION,
    "priceYearly" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_plugins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_products" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "installationType" "InstallationType",
    "priceMonthly" DOUBLE PRECISION,
    "priceQuarterly" DOUBLE PRECISION,
    "priceYearly" DOUBLE PRECISION,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_product_plugins" (
    "id" TEXT NOT NULL,
    "clientProductId" TEXT NOT NULL,
    "productPluginId" TEXT NOT NULL,
    "priceMonthly" DOUBLE PRECISION,
    "priceQuarterly" DOUBLE PRECISION,
    "priceYearly" DOUBLE PRECISION,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_product_plugins_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "client_product_serials"
ADD COLUMN "clientProductId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "product_plugins_productId_name_key" ON "product_plugins"("productId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "client_products_clientId_productId_key" ON "client_products"("clientId", "productId");

-- CreateIndex
CREATE INDEX "client_products_productId_idx" ON "client_products"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "client_product_plugins_clientProductId_productPluginId_key" ON "client_product_plugins"("clientProductId", "productPluginId");

-- CreateIndex
CREATE INDEX "client_product_plugins_productPluginId_idx" ON "client_product_plugins"("productPluginId");

-- CreateIndex
CREATE INDEX "client_product_serials_clientProductId_idx" ON "client_product_serials"("clientProductId");

-- AddForeignKey
ALTER TABLE "product_plugins" ADD CONSTRAINT "product_plugins_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_products" ADD CONSTRAINT "client_products_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_products" ADD CONSTRAINT "client_products_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_product_plugins" ADD CONSTRAINT "client_product_plugins_clientProductId_fkey" FOREIGN KEY ("clientProductId") REFERENCES "client_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_product_plugins" ADD CONSTRAINT "client_product_plugins_productPluginId_fkey" FOREIGN KEY ("productPluginId") REFERENCES "product_plugins"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_product_serials" ADD CONSTRAINT "client_product_serials_clientProductId_fkey" FOREIGN KEY ("clientProductId") REFERENCES "client_products"("id") ON DELETE SET NULL ON UPDATE CASCADE;
