-- Fix duplicate foreign key constraint on properties.approvedBy
-- Drop the incorrect constraint that references the 'users' table (lowercase)
-- Keep the correct constraint that references the 'Users' table (uppercase)

ALTER TABLE `properties` DROP FOREIGN KEY `properties_ibfk_3`;
