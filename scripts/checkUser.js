import { User } from '../schema/index.js';

/**
 * Check if a user exists in the database
 */
const checkUser = async () => {
  try {
    const userId = '64c0399f-eb54-4ad5-86a1-9f28adfcea2a';
    
    console.log(`🔍 Checking if user ${userId} exists...\n`);

    // Check with paranoid: false to include soft-deleted users
    const user = await User.findByPk(userId, {
      paranoid: false
    });

    if (!user) {
      console.log('❌ User NOT FOUND in database');
      console.log('\n📋 This explains the foreign key constraint error.');
      console.log('💡 Solution: The user needs to be created in the database or you need to log in with a valid user account.\n');
    } else {
      console.log('✅ User FOUND in database');
      console.log('\nUser Details:');
      console.log(`- ID: ${user.id}`);
      console.log(`- Email: ${user.email}`);
      console.log(`- Name: ${user.firstName} ${user.lastName}`);
      console.log(`- Status: ${user.status}`);
      console.log(`- Deleted: ${user.deletedAt ? 'Yes (soft-deleted)' : 'No'}`);
      console.log(`- Created: ${user.createdAt}\n`);

      if (user.deletedAt) {
        console.log('⚠️  User is soft-deleted. This will cause the foreign key constraint error.');
      } else if (user.status !== 'active') {
        console.log(`⚠️  User status is "${user.status}". Should be "active".`);
      } else {
        console.log('✅ User is active and should work fine.\n');
      }
    }

    // Also check the receiver
    const receiverId = '5b226fa3-11b4-4f84-8886-fe99a0ef61e7';
    console.log(`\n🔍 Checking receiver ${receiverId}...\n`);
    
    const receiver = await User.findByPk(receiverId, {
      paranoid: false
    });

    if (!receiver) {
      console.log('❌ Receiver NOT FOUND in database\n');
    } else {
      console.log('✅ Receiver FOUND in database');
      console.log(`- Email: ${receiver.email}`);
      console.log(`- Name: ${receiver.firstName} ${receiver.lastName}`);
      console.log(`- Status: ${receiver.status}\n`);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
};

checkUser();
