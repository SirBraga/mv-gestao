-- AlterTable
ALTER TABLE "products" ADD COLUMN     "hasSerialControl" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "client_product_serials" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "serial" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_product_serials_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "client_product_serials_clientId_productId_serial_key" ON "client_product_serials"("clientId", "productId", "serial");

-- AddForeignKey
ALTER TABLE "client_product_serials" ADD CONSTRAINT "client_product_serials_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_product_serials" ADD CONSTRAINT "client_product_serials_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
