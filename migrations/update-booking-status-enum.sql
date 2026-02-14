-- Update booking status ENUM to include 'in_progress'
-- This fixes the "Data truncated for column 'status'" error

ALTER TABLE `bookings` 
MODIFY COLUMN `status` ENUM('pending', 'in_progress', 'confirmed', 'cancelled', 'completed', 'rejected', 'expired') 
NOT NULL DEFAULT 'pending';
