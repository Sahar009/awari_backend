import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import sequelize from '../database/db.js';

dotenv.config();

const checkUserTables = async () => {
  let connection;
  
  try {
    console.log('🔍 Checking for user tables in database...\n');
    
    // Connect to database
    await sequelize.authenticate();
    console.log('✅ Connected to database\n');
    
    // Get database name from connection
    const dbName = sequelize.config.database;
    console.log(`📊 Database: ${dbName}\n`);
    
    // Check for tables with 'user' in the name
    const tables = await sequelize.query(`
      SELECT TABLE_NAME 
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = ? 
      AND (TABLE_NAME LIKE '%user%' OR TABLE_NAME LIKE '%User%')
      ORDER BY TABLE_NAME
    `, {
      replacements: [dbName],
      type: sequelize.QueryTypes.SELECT
    });
    
    console.log('📋 Found tables with "user" in name:');
    tables.forEach(table => {
      console.log(`   - ${table.TABLE_NAME}`);
    });
    console.log('');
    
    // Check row counts for each table
    const tableCounts = {};
    
    for (const table of tables) {
      const tableName = table.TABLE_NAME;
      try {
        const [countResult] = await sequelize.query(
          `SELECT COUNT(*) as count FROM \`${tableName}\``,
          { type: sequelize.QueryTypes.SELECT }
        );
        const count = countResult.count || 0;
        tableCounts[tableName] = count;
        console.log(`   ${tableName}: ${count} rows`);
      } catch (error) {
        console.log(`   ${tableName}: Error counting rows - ${error.message}`);
        tableCounts[tableName] = -1;
      }
    }
    
    console.log('\n📊 Summary:');
    console.log('='.repeat(50));
    
    // Find the table with 37 users
    const targetTable = Object.entries(tableCounts).find(([name, count]) => count === 37);
    const smallTable = Object.entries(tableCounts).find(([name, count]) => count === 4);
    
    if (targetTable) {
      console.log(`✅ Target table (37 users): ${targetTable[0]}`);
    } else {
      console.log('⚠️  No table found with exactly 37 users');
      console.log('   Tables and their counts:');
      Object.entries(tableCounts).forEach(([name, count]) => {
        console.log(`      ${name}: ${count} rows`);
      });
    }
    
    if (smallTable) {
      console.log(`⚠️  Small table (4 users): ${smallTable[0]}`);
    }
    
    console.log('\n🔧 Current User model configuration:');
    console.log(`   Model name: User`);
    console.log(`   Table name: users (lowercase)`);
    
    // Check what table Sequelize is actually using
    const User = (await import('../schema/User.js')).default;
    const actualTableName = User.tableName;
    console.log(`   Sequelize tableName: ${actualTableName}`);
    
    // Check if the target table exists and matches
    if (targetTable) {
      const targetTableName = targetTable[0];
      console.log(`\n✅ Recommended action:`);
      
      if (targetTableName.toLowerCase() === 'users') {
        console.log(`   ✓ Table name matches! The User model should work correctly.`);
        console.log(`   ✓ The table "${targetTableName}" has 37 users and matches the model's tableName.`);
      } else {
        console.log(`   ⚠️  Table name mismatch!`);
        console.log(`   Current model tableName: "users"`);
        console.log(`   Target table name: "${targetTableName}"`);
        console.log(`   Action needed: Update User model tableName to "${targetTableName}"`);
      }
      
      // Check for the small table
      if (smallTable) {
        console.log(`\n⚠️  Found small table "${smallTable[0]}" with 4 users.`);
        console.log(`   Recommendation: Check if data needs to be migrated or if table should be dropped.`);
      }
    }
    
    return {
      tables: tableCounts,
      targetTable: targetTable ? targetTable[0] : null,
      smallTable: smallTable ? smallTable[0] : null
    };
    
  } catch (error) {
    console.error('❌ Error checking tables:', error.message);
    console.error(error.stack);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
    await sequelize.close();
  }
};

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.includes('checkUserTables')) {
  checkUserTables()
    .then((result) => {
      console.log('\n✅ Check completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Check failed:', error.message);
      process.exit(1);
    });
}

export default checkUserTables;

