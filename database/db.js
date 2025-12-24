import { Sequelize } from 'sequelize';
import { config } from "../config/config.js";

const sequelize = new Sequelize(
  config.database.name,
  config.database.user,
  config.database.password,
  {
    host: config.database.host,
    port: config.database.port,
    dialect: 'mysql',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 5,
      min: 0,
      acquire: 60000,
      idle: 10000
    },
    retry: {
      max: 3
    },
    // Cloud SQL specific settings - only SSL if explicitly enabled
    dialectOptions: process.env.DB_SSL === 'true' ? {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    } : {}
  }
)

export const connectToDB = async () => {
  try {
    console.log(`🔌 Attempting to connect to database at ${config.database.host}:${config.database.port}...`);
    
    await sequelize.authenticate()
    console.log("✅ Connected to Cloud SQL database successfully")

    // Sync database with proper order handling
    try {
      await sequelize.sync({ force: false, alter: false })
      console.log("✅ Database synchronized successfully")
    } catch (syncError) {
      console.warn("⚠️ Database sync warning:", syncError.message)
      // Try to sync without foreign key checks
      try {
        await sequelize.query('SET FOREIGN_KEY_CHECKS = 0;')
        await sequelize.sync({ force: false, alter: false })
        await sequelize.query('SET FOREIGN_KEY_CHECKS = 1;')
        console.log("✅ Database synchronized with foreign key checks disabled")
      } catch (finalError) {
        console.error("❌ Final sync attempt failed:", finalError.message)
        throw finalError
      }
    }
    
    // Manually create Bookings table if it doesn't exist
    try {
      const [results] = await sequelize.query(
        "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE' AND TABLE_NAME = 'Bookings' AND TABLE_SCHEMA = DATABASE()"
      );
      
      if (results.length === 0) {
        console.log("📋 Bookings table doesn't exist, creating it...");
        // Import Booking model to trigger table creation
        const { default: Booking } = await import('../schema/Booking.js');
        await Booking.sync({ force: false });
        console.log("✅ Bookings table created successfully");
      } else {
        // Table exists, check if we need to update inspectionDate and inspectionTime columns
        const [columns] = await sequelize.query("DESCRIBE Bookings");
        const inspectionDateCol = columns.find(col => col.Field === 'inspectionDate');
        const inspectionTimeCol = columns.find(col => col.Field === 'inspectionTime');
        
        if (inspectionDateCol && inspectionDateCol.Type !== 'date') {
          console.log("🔧 Updating inspectionDate column type...");
          await sequelize.query("ALTER TABLE Bookings MODIFY COLUMN inspectionDate DATE NULL");
          console.log("✅ inspectionDate column updated");
        }
        
        if (inspectionTimeCol && !inspectionTimeCol.Type.includes('varchar')) {
          console.log("🔧 Updating inspectionTime column type...");
          await sequelize.query("ALTER TABLE Bookings MODIFY COLUMN inspectionTime VARCHAR(5) NULL");
          console.log("✅ inspectionTime column updated");
        }
      }
    } catch (bookingTableError) {
      console.warn("⚠️ Bookings table check/creation warning:", bookingTableError.message);
    }
    
  } catch (error) {
    console.error("❌ Unable to connect to the database:", error.message)
    console.log("\n🔧 Cloud SQL Troubleshooting:")
    console.log("1. Check your .env file has correct Cloud SQL credentials")
    console.log("2. Verify the Cloud SQL instance is running")
    console.log("3. Check if your IP is whitelisted in Cloud SQL")
    console.log("4. Verify database name, username, and password")
    console.log("5. Check if the database exists")
    throw error; // Re-throw to stop server startup
  }
}

export default sequelize

