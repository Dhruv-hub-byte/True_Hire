-- CreateTable
CREATE TABLE `Session` (
    `id` VARCHAR(191) NOT NULL,
    `token` VARCHAR(191) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `userId` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `Session_token_key`(`token`),
    INDEX `Session_userId_idx`(`userId`),
    INDEX `Session_token_idx`(`token`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `role` ENUM('ADMIN', 'INTERVIEWER', 'CANDIDATE') NOT NULL DEFAULT 'CANDIDATE',
    `phone` VARCHAR(191) NULL,
    `profileImage` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `emailVerified` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `companyId` VARCHAR(191) NULL,

    UNIQUE INDEX `User_email_key`(`email`),
    INDEX `User_email_idx`(`email`),
    INDEX `User_role_idx`(`role`),
    INDEX `User_companyId_idx`(`companyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Company` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `logo` VARCHAR(191) NULL,
    `website` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Company_name_idx`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Interview` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `startTime` DATETIME(3) NOT NULL,
    `endTime` DATETIME(3) NOT NULL,
    `duration` INTEGER NOT NULL,
    `status` ENUM('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'SCHEDULED',
    `videoRecording` VARCHAR(191) NULL,
    `audioRecording` VARCHAR(191) NULL,
    `screenRecording` VARCHAR(191) NULL,
    `transcript` VARCHAR(191) NULL,
    `sentimentScore` DOUBLE NULL,
    `confidenceScore` DOUBLE NULL,
    `communicationScore` DOUBLE NULL,
    `cheatingProbability` DOUBLE NULL DEFAULT 0.0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `candidateId` VARCHAR(191) NOT NULL,
    `interviewerId` VARCHAR(191) NULL,

    INDEX `Interview_candidateId_idx`(`candidateId`),
    INDEX `Interview_interviewerId_idx`(`interviewerId`),
    INDEX `Interview_companyId_idx`(`companyId`),
    INDEX `Interview_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Question` (
    `id` VARCHAR(191) NOT NULL,
    `text` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL DEFAULT 'GENERAL',
    `codeTemplate` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,

    INDEX `Question_companyId_idx`(`companyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InterviewQuestion` (
    `id` VARCHAR(191) NOT NULL,
    `order` INTEGER NOT NULL,
    `answer` VARCHAR(191) NULL,
    `timeSpent` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `interviewId` VARCHAR(191) NOT NULL,
    `questionId` VARCHAR(191) NOT NULL,

    INDEX `InterviewQuestion_interviewId_idx`(`interviewId`),
    UNIQUE INDEX `InterviewQuestion_interviewId_questionId_key`(`interviewId`, `questionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Violation` (
    `id` VARCHAR(191) NOT NULL,
    `type` ENUM('TAB_SWITCH', 'FOCUS_LOSS', 'COPY_PASTE_ATTEMPT', 'RIGHT_CLICK_ATTEMPT', 'TEXT_SELECTION_ATTEMPT', 'MULTIPLE_MONITORS', 'SUSPICIOUS_BEHAVIOR') NOT NULL,
    `description` VARCHAR(191) NOT NULL,
    `timestamp` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `severity` INTEGER NOT NULL DEFAULT 1,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `interviewId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,

    INDEX `Violation_interviewId_idx`(`interviewId`),
    INDEX `Violation_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Report` (
    `id` VARCHAR(191) NOT NULL,
    `summary` VARCHAR(191) NOT NULL,
    `strengths` JSON NOT NULL,
    `weaknesses` JSON NOT NULL,
    `recommendations` JSON NOT NULL,
    `overallScore` DOUBLE NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `interviewId` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `Report_interviewId_key`(`interviewId`),
    INDEX `Report_interviewId_idx`(`interviewId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ChatMessage` (
    `id` VARCHAR(191) NOT NULL,
    `message` VARCHAR(191) NOT NULL,
    `senderRole` ENUM('ADMIN', 'INTERVIEWER', 'CANDIDATE') NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `interviewId` VARCHAR(191) NOT NULL,

    INDEX `ChatMessage_interviewId_idx`(`interviewId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Session` ADD CONSTRAINT `Session_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `User` ADD CONSTRAINT `User_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Interview` ADD CONSTRAINT `Interview_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Interview` ADD CONSTRAINT `Interview_candidateId_fkey` FOREIGN KEY (`candidateId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Interview` ADD CONSTRAINT `Interview_interviewerId_fkey` FOREIGN KEY (`interviewerId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Question` ADD CONSTRAINT `Question_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InterviewQuestion` ADD CONSTRAINT `InterviewQuestion_interviewId_fkey` FOREIGN KEY (`interviewId`) REFERENCES `Interview`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InterviewQuestion` ADD CONSTRAINT `InterviewQuestion_questionId_fkey` FOREIGN KEY (`questionId`) REFERENCES `Question`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Violation` ADD CONSTRAINT `Violation_interviewId_fkey` FOREIGN KEY (`interviewId`) REFERENCES `Interview`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Violation` ADD CONSTRAINT `Violation_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Report` ADD CONSTRAINT `Report_interviewId_fkey` FOREIGN KEY (`interviewId`) REFERENCES `Interview`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ChatMessage` ADD CONSTRAINT `ChatMessage_interviewId_fkey` FOREIGN KEY (`interviewId`) REFERENCES `Interview`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
