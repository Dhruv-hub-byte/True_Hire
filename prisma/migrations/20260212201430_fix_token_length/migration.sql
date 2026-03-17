-- DropForeignKey
ALTER TABLE `session` DROP FOREIGN KEY `Session_userId_fkey`;

-- DropIndex
DROP INDEX `Session_token_idx` ON `session`;

-- AlterTable
ALTER TABLE `session` MODIFY `token` VARCHAR(255) NOT NULL;

-- AddForeignKey
ALTER TABLE `session` ADD CONSTRAINT `session_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER TABLE `session` RENAME INDEX `Session_token_key` TO `session_token_key`;

-- RenameIndex
ALTER TABLE `session` RENAME INDEX `Session_userId_idx` TO `session_userId_idx`;
