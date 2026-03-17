-- AlterTable
ALTER TABLE `company` ADD COLUMN `deletedAt` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `session` ADD COLUMN `ipAddress` VARCHAR(191) NULL,
    ADD COLUMN `userAgent` VARCHAR(500) NULL;

-- AlterTable
ALTER TABLE `user` ADD COLUMN `deletedAt` DATETIME(3) NULL,
    ADD COLUMN `lastLoginAt` DATETIME(3) NULL,
    ADD COLUMN `status` ENUM('ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING_VERIFICATION') NOT NULL DEFAULT 'ACTIVE';

-- CreateIndex
CREATE INDEX `Company_deletedAt_idx` ON `company`(`deletedAt`);

-- CreateIndex
CREATE INDEX `Session_expiresAt_idx` ON `session`(`expiresAt`);

-- CreateIndex
CREATE INDEX `User_status_idx` ON `user`(`status`);

-- CreateIndex
CREATE INDEX `User_deletedAt_idx` ON `user`(`deletedAt`);
