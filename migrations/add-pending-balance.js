import sequelize from '../database/db.js';
import Wallet from '../schema/Wallet.js';
import WalletTransaction from '../schema/WalletTransaction.js';
import Booking from '../schema/Booking.js';

/**
 * Migration: Add pending balance support to wallets
 * 
 * This migration:
 * 1. Adds availableBalance and pendingBalance columns to wallets table
 * 2. Migrates existing balance data to availableBalance
 * 3. Adds wallet status fields to bookings table
 * 4. Adds balance tracking fields to wallet_transactions table
 */

async function migrate() {
    console.log('🔄 Starting pending balance migration...');

    try {
        const transaction = await sequelize.transaction();

        try {
            // Step 1: Add new columns to wallets table
            console.log('📝 Adding availableBalance and pendingBalance columns to wallets...');

            // Check if columns exist
            const [walletColumns] = await sequelize.query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'wallets' 
        AND COLUMN_NAME IN ('availableBalance', 'pendingBalance');
      `, { transaction });

            const existingWalletColumns = walletColumns.map(col => col.COLUMN_NAME);

            // Add availableBalance if it doesn't exist
            if (!existingWalletColumns.includes('availableBalance')) {
                await sequelize.query(`
          ALTER TABLE wallets 
          ADD COLUMN availableBalance DECIMAL(15, 2) DEFAULT 0.00 NOT NULL;
        `, { transaction });
                console.log('✅ Added availableBalance column');
            } else {
                console.log('ℹ️  availableBalance column already exists');
            }

            // Add pendingBalance if it doesn't exist
            if (!existingWalletColumns.includes('pendingBalance')) {
                await sequelize.query(`
          ALTER TABLE wallets 
          ADD COLUMN pendingBalance DECIMAL(15, 2) DEFAULT 0.00 NOT NULL;
        `, { transaction });
                console.log('✅ Added pendingBalance column');
            } else {
                console.log('ℹ️  pendingBalance column already exists');
            }

            // Step 2: Migrate existing balance to availableBalance
            console.log('📦 Migrating existing balance data...');

            await sequelize.query(`
        UPDATE wallets 
        SET availableBalance = COALESCE(balance, 0.00),
            pendingBalance = 0.00
        WHERE availableBalance = 0.00;
      `, { transaction });

            // Step 3: Remove old balance column (optional - keep for now for safety)
            console.log('⚠️  Keeping old balance column for safety (can be removed later)');

            // Step 4: Add wallet status fields to bookings table
            console.log('📝 Adding wallet status fields to bookings...');

            // Check if booking columns exist
            const [bookingColumns] = await sequelize.query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'bookings' 
        AND COLUMN_NAME IN ('walletStatus', 'walletTransactionId', 'walletReleaseDate');
      `, { transaction });

            const existingBookingColumns = bookingColumns.map(col => col.COLUMN_NAME);

            if (!existingBookingColumns.includes('walletStatus')) {
                await sequelize.query(`
          ALTER TABLE bookings 
          ADD COLUMN walletStatus VARCHAR(20) DEFAULT 'none' NOT NULL;
        `, { transaction });
                console.log('✅ Added walletStatus column');
            } else {
                console.log('ℹ️  walletStatus column already exists');
            }

            if (!existingBookingColumns.includes('walletTransactionId')) {
                await sequelize.query(`
          ALTER TABLE bookings 
          ADD COLUMN walletTransactionId CHAR(36);
        `, { transaction });
                console.log('✅ Added walletTransactionId column');
            } else {
                console.log('ℹ️  walletTransactionId column already exists');
            }

            if (!existingBookingColumns.includes('walletReleaseDate')) {
                await sequelize.query(`
          ALTER TABLE bookings 
          ADD COLUMN walletReleaseDate DATE;
        `, { transaction });
                console.log('✅ Added walletReleaseDate column');
            } else {
                console.log('ℹ️  walletReleaseDate column already exists');
            }

            // Step 5: Add balance tracking fields to wallet_transactions table
            console.log('📝 Adding balance tracking fields to wallet_transactions...');

            // Check if wallet_transactions columns exist
            const [txnColumns] = await sequelize.query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'wallet_transactions' 
        AND COLUMN_NAME IN ('availableBalanceBefore', 'availableBalanceAfter', 'pendingBalanceBefore', 'pendingBalanceAfter', 'releaseDate');
      `, { transaction });

            const existingTxnColumns = txnColumns.map(col => col.COLUMN_NAME);

            if (!existingTxnColumns.includes('availableBalanceBefore')) {
                await sequelize.query(`
          ALTER TABLE wallet_transactions 
          ADD COLUMN availableBalanceBefore DECIMAL(15, 2);
        `, { transaction });
                console.log('✅ Added availableBalanceBefore column');
            }

            if (!existingTxnColumns.includes('availableBalanceAfter')) {
                await sequelize.query(`
          ALTER TABLE wallet_transactions 
          ADD COLUMN availableBalanceAfter DECIMAL(15, 2);
        `, { transaction });
                console.log('✅ Added availableBalanceAfter column');
            }

            if (!existingTxnColumns.includes('pendingBalanceBefore')) {
                await sequelize.query(`
          ALTER TABLE wallet_transactions 
          ADD COLUMN pendingBalanceBefore DECIMAL(15, 2);
        `, { transaction });
                console.log('✅ Added pendingBalanceBefore column');
            }

            if (!existingTxnColumns.includes('pendingBalanceAfter')) {
                await sequelize.query(`
          ALTER TABLE wallet_transactions 
          ADD COLUMN pendingBalanceAfter DECIMAL(15, 2);
        `, { transaction });
                console.log('✅ Added pendingBalanceAfter column');
            }

            if (!existingTxnColumns.includes('releaseDate')) {
                await sequelize.query(`
          ALTER TABLE wallet_transactions 
          ADD COLUMN releaseDate DATE;
        `, { transaction });
                console.log('✅ Added releaseDate column');
            }

            // Commit transaction
            await transaction.commit();

            console.log('✅ Migration completed successfully!');
            console.log('');
            console.log('Summary:');
            console.log('- Added availableBalance and pendingBalance to wallets');
            console.log('- Migrated existing balance data to availableBalance');
            console.log('- Added walletStatus, walletTransactionId, walletReleaseDate to bookings');
            console.log('- Added balance tracking fields to wallet_transactions');

        } catch (error) {
            // Rollback on error
            await transaction.rollback();
            throw error;
        }

    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    }
}

async function rollback() {
    console.log('🔄 Rolling back pending balance migration...');

    try {
        const transaction = await sequelize.transaction();

        try {
            // Remove new columns from wallets
            console.log('📝 Removing columns from wallets...');

            const [walletColumns] = await sequelize.query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'wallets' 
        AND COLUMN_NAME IN ('availableBalance', 'pendingBalance');
      `, { transaction });

            for (const col of walletColumns) {
                await sequelize.query(`
          ALTER TABLE wallets DROP COLUMN ${col.COLUMN_NAME};
        `, { transaction });
                console.log(`✅ Dropped ${col.COLUMN_NAME} from wallets`);
            }

            // Remove wallet status fields from bookings
            console.log('📝 Removing columns from bookings...');

            const [bookingColumns] = await sequelize.query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'bookings' 
        AND COLUMN_NAME IN ('walletStatus', 'walletTransactionId', 'walletReleaseDate');
      `, { transaction });

            for (const col of bookingColumns) {
                await sequelize.query(`
          ALTER TABLE bookings DROP COLUMN ${col.COLUMN_NAME};
        `, { transaction });
                console.log(`✅ Dropped ${col.COLUMN_NAME} from bookings`);
            }

            // Remove balance tracking fields from wallet_transactions
            console.log('📝 Removing columns from wallet_transactions...');

            const [txnColumns] = await sequelize.query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'wallet_transactions' 
        AND COLUMN_NAME IN ('availableBalanceBefore', 'availableBalanceAfter', 'pendingBalanceBefore', 'pendingBalanceAfter', 'releaseDate');
      `, { transaction });

            for (const col of txnColumns) {
                await sequelize.query(`
          ALTER TABLE wallet_transactions DROP COLUMN ${col.COLUMN_NAME};
        `, { transaction });
                console.log(`✅ Dropped ${col.COLUMN_NAME} from wallet_transactions`);
            }

            await transaction.commit();
            console.log('✅ Rollback completed successfully!');

        } catch (error) {
            await transaction.rollback();
            throw error;
        }

    } catch (error) {
        console.error('❌ Rollback failed:', error);
        throw error;
    }
}

// Run migration if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const command = process.argv[2];

    if (command === 'rollback') {
        rollback()
            .then(() => process.exit(0))
            .catch(() => process.exit(1));
    } else {
        migrate()
            .then(() => process.exit(0))
            .catch(() => process.exit(1));
    }
}

export { migrate, rollback };
