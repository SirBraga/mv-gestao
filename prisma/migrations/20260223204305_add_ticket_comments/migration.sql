-- CreateTable
CREATE TABLE "ticket_comment" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ticket_comment_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ticket_comment" ADD CONSTRAINT "ticket_comment_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_comment" ADD CONSTRAINT "ticket_comment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_comment" ADD CONSTRAINT "ticket_comment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ticket_comment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
