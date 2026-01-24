-- Add push_tokens table for storing Expo push notification tokens
CREATE TABLE IF NOT EXISTS `push_tokens` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NOT NULL,
    `token` TEXT NOT NULL,
    `platform` VARCHAR(10),
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    `last_used_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    INDEX `push_tokens_user_idx` (`user_id`),
    INDEX `push_tokens_token_idx` (`token`(255))
);

-- Add drip_emails_sent table for tracking onboarding email sequence
CREATE TABLE IF NOT EXISTS `drip_emails_sent` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NOT NULL,
    `email_type` VARCHAR(50) NOT NULL,
    `sent_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    INDEX `drip_emails_user_idx` (`user_id`),
    INDEX `drip_emails_type_idx` (`email_type`)
);
