-- AlterTable
ALTER TABLE "tickets" ADD COLUMN     "knowledgeArticleId" TEXT;

-- CreateTable
CREATE TABLE "knowledge_base_article" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "summary" TEXT,
    "content" TEXT NOT NULL,
    "category" TEXT,
    "status" TEXT NOT NULL DEFAULT 'RASCUNHO',
    "difficulty" TEXT,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "helpfulCount" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "knowledge_base_article_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "knowledge_base_article_product" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "knowledge_base_article_product_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "knowledge_base_article_slug_key" ON "knowledge_base_article"("slug");

-- CreateIndex
CREATE INDEX "knowledge_base_article_status_idx" ON "knowledge_base_article"("status");

-- CreateIndex
CREATE INDEX "knowledge_base_article_category_idx" ON "knowledge_base_article"("category");

-- CreateIndex
CREATE INDEX "knowledge_base_article_product_productId_idx" ON "knowledge_base_article_product"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "knowledge_base_article_product_articleId_productId_key" ON "knowledge_base_article_product"("articleId", "productId");

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_knowledgeArticleId_fkey" FOREIGN KEY ("knowledgeArticleId") REFERENCES "knowledge_base_article"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_base_article" ADD CONSTRAINT "knowledge_base_article_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_base_article" ADD CONSTRAINT "knowledge_base_article_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_base_article_product" ADD CONSTRAINT "knowledge_base_article_product_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "knowledge_base_article"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_base_article_product" ADD CONSTRAINT "knowledge_base_article_product_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
