/*
  Warnings:

  - You are about to drop the `chat_message` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "ChannelType" AS ENUM ('DIRECT', 'GROUP', 'SUPPORT', 'PROJECT');

-- CreateEnum
CREATE TYPE "MemberRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');

-- CreateEnum
CREATE TYPE "MessageType" AS ENUM ('TEXT', 'IMAGE', 'VIDEO', 'AUDIO', 'FILE', 'SYSTEM');

-- DropForeignKey
ALTER TABLE "attachment" DROP CONSTRAINT "attachment_chatMessageId_fkey";

-- DropForeignKey
ALTER TABLE "chat_message" DROP CONSTRAINT "chat_message_receiverId_fkey";

-- DropForeignKey
ALTER TABLE "chat_message" DROP CONSTRAINT "chat_message_replyToId_fkey";

-- DropForeignKey
ALTER TABLE "chat_message" DROP CONSTRAINT "chat_message_senderId_fkey";

-- DropTable
DROP TABLE "chat_message";

-- CreateTable
CREATE TABLE "chat_channels" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "ChannelType" NOT NULL DEFAULT 'DIRECT',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chat_channels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "channel_members" (
    "id" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "MemberRole" NOT NULL DEFAULT 'MEMBER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "mutedUntil" TIMESTAMP(3),
    "lastReadAt" TIMESTAMP(3),

    CONSTRAINT "channel_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_messages" (
    "id" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "type" "MessageType" NOT NULL DEFAULT 'TEXT',
    "mediaUrl" TEXT,
    "mediaType" TEXT,
    "fileName" TEXT,
    "fileSize" INTEGER,
    "replyToId" TEXT,
    "isEdited" BOOLEAN NOT NULL DEFAULT false,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_media_files" (
    "id" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_media_files_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "chat_channels_createdById_idx" ON "chat_channels"("createdById");

-- CreateIndex
CREATE INDEX "channel_members_userId_idx" ON "channel_members"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "channel_members_channelId_userId_key" ON "channel_members"("channelId", "userId");

-- CreateIndex
CREATE INDEX "chat_messages_channelId_idx" ON "chat_messages"("channelId");

-- CreateIndex
CREATE INDEX "chat_messages_senderId_idx" ON "chat_messages"("senderId");

-- CreateIndex
CREATE INDEX "chat_messages_replyToId_idx" ON "chat_messages"("replyToId");

-- CreateIndex
CREATE INDEX "chat_media_files_uploadedById_idx" ON "chat_media_files"("uploadedById");

-- AddForeignKey
ALTER TABLE "attachment" ADD CONSTRAINT "attachment_chatMessageId_fkey" FOREIGN KEY ("chatMessageId") REFERENCES "chat_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_channels" ADD CONSTRAINT "chat_channels_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "channel_members" ADD CONSTRAINT "channel_members_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "chat_channels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "channel_members" ADD CONSTRAINT "channel_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "chat_channels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_replyToId_fkey" FOREIGN KEY ("replyToId") REFERENCES "chat_messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_media_files" ADD CONSTRAINT "chat_media_files_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
