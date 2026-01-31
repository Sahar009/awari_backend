-- Fix notifications table collation to match utf8mb4_unicode_ci
-- This resolves the collation mismatch error when inserting notifications

ALTER TABLE notifications CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Also ensure all text columns use the correct collation
ALTER TABLE notifications 
  MODIFY COLUMN title VARCHAR(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  MODIFY COLUMN message TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  MODIFY COLUMN actionUrl VARCHAR(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  MODIFY COLUMN actionText VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
