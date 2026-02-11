-- Add companyName column to Users table
ALTER TABLE Users ADD COLUMN companyName VARCHAR(255) NULL COMMENT 'Company name for business users (landlords, agents, hotel providers, buyers)';
