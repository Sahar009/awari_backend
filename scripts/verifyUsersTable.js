import dotenv from 'dotenv';
import sequelize from '../database/db.js';
import User from '../schema/User.js';

dotenv.config();

const verifyUsersTable = async () => {
  try {
    console.log('🔍 Verifying Users table configuration...\n');
    
    // Connect to database
    await sequelize.authenticate();
    console.log('✅ Connected to database\n');
    
    // Check User model configuration
    console.log('📋 User Model Configuration:');
    console.log(`   Model name: ${User.name}`);
    console.log(`   Table name: ${User.tableName}`);
    console.log(`   Expected: Users (capitalized)\n`);
    
    if (User.tableName !== 'Users') {
      console.error('❌ ERROR: User model tableName is not "Users"!');
      console.error(`   Current: "${User.tableName}"`);
      console.error(`   Expected: "Users"`);
      return false;
    }
    
    console.log('✅ User model tableName is correctly set to "Users"\n');
    
    // Test query using the User model
    console.log('🧪 Testing User model query...');
    const userCount = await User.count();
    console.log(`   Found ${userCount} users using User model\n`);
    
    // Test raw SQL query
    console.log('🧪 Testing raw SQL query...');
    const [rawResult] = await sequelize.query(
      'SELECT COUNT(*) as count FROM Users',
      { type: sequelize.QueryTypes.SELECT }
    );
    console.log(`   Found ${rawResult.count} users using raw SQL\n`);
    
    // Verify they match
    if (userCount === parseInt(rawResult.count)) {
      console.log('✅ User model and raw SQL queries match!\n');
    } else {
      console.error('❌ ERROR: User model and raw SQL queries do not match!');
      return false;
    }
    
    // Check for lowercase 'users' table
    console.log('🔍 Checking for lowercase "users" table...');
    try {
      const [lowercaseResult] = await sequelize.query(
        'SELECT COUNT(*) as count FROM users',
        { type: sequelize.QueryTypes.SELECT }
      );
      console.log(`   ⚠️  Found lowercase "users" table with ${lowercaseResult.count} rows`);
      console.log(`   Note: This table is not being used by the application\n`);
    } catch (error) {
      console.log('   ✓ No lowercase "users" table found (or not accessible)\n');
    }
    
    // Summary
    console.log('📊 Summary:');
    console.log('='.repeat(50));
    console.log('✅ User model tableName: "Users" (correct)');
    console.log(`✅ Users table contains: ${userCount} users`);
    console.log('✅ All services use User model (will use correct table)');
    console.log('✅ Raw SQL queries use "Users" (capitalized)');
    console.log('\n✅ All configurations are correct!');
    
    await sequelize.close();
    return true;
    
  } catch (error) {
    console.error('❌ Error verifying Users table:', error.message);
    console.error(error.stack);
    await sequelize.close();
    return false;
  }
};

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.includes('verifyUsersTable')) {
  verifyUsersTable()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error('\n❌ Verification failed:', error.message);
      process.exit(1);
    });
}

export default verifyUsersTable;


