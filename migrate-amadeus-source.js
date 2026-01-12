import sequelize from './database/db.js';

async function migrate() {
    console.log('🚀 Updating source ENUM to include amadeus...');

    try {
        await sequelize.query(`
      ALTER TABLE properties 
      MODIFY COLUMN source ENUM('local', 'booking_com', 'expedia', 'amadeus') DEFAULT 'local' NOT NULL
    `);
        console.log('✅ Properties source enum updated.');
        console.log('🎉 Migration completed successfully!');
    } catch (error) {
        console.error('❌ Migration failed:', error);
    } finally {
        process.exit();
    }
}

migrate();
