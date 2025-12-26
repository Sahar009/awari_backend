-- Migration: Add 'processing' and 'cancelled' to wallet_transactions status enum
-- Date: 2025-12-26
-- Description: Update status column to support withdrawal workflow

ALTER TABLE `wallet_transactions` 
MODIFY COLUMN `status` ENUM('pending', 'processing', 'completed', 'failed', 'cancelled', 'reversed') 
NOT NULL DEFAULT 'pending';

-- Verify the change
DESCRIBE `wallet_transactions`;
