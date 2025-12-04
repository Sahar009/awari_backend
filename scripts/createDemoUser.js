/**
 * Script to create a demo test user account
 * Usage: node scripts/createDemoUser.js
 */

import 'dotenv/config';
import { User } from '../schema/index.js';
import sequelize from '../database/db.js';
import { hashPassword } from '../utils/index.js';

const DEMO_USER = {
  email: 'devuser@mail.com',
  password: 'Dev123456@',
  firstName: 'Dev',
  lastName: 'User',
  role: 'agent',
  status: 'active',
  emailVerified: true,
  profileCompleted: true,
};

async function createDemoUser() {
  try {
    // Authenticate database connection
    await sequelize.authenticate();
    console.log('✅ Database connection established');

    console.log('🚀 Starting demo user creation...');
    console.log('📝 User details:', {
      email: DEMO_USER.email,
      firstName: DEMO_USER.firstName,
      lastName: DEMO_USER.lastName,
      role: DEMO_USER.role,
    });

    // Check if user already exists
    const existingUser = await User.findOne({
      where: { email: DEMO_USER.email },
      paranoid: false, // Include soft-deleted users
    });

    if (existingUser) {
      if (existingUser.deletedAt) {
        console.log('⚠️  User exists but is soft-deleted. Restoring...');
        existingUser.deletedAt = null;
        await existingUser.restore();
      } else {
        console.log('ℹ️  User already exists. Updating...');
      }

      // Update existing user
      const hashedPassword = await hashPassword(DEMO_USER.password);
      await existingUser.update({
        firstName: DEMO_USER.firstName,
        lastName: DEMO_USER.lastName,
        passwordHash: hashedPassword,
        role: DEMO_USER.role,
        status: DEMO_USER.status,
        emailVerified: DEMO_USER.emailVerified,
        profileCompleted: DEMO_USER.profileCompleted,
      });

      const { passwordHash, emailVerificationCode, ...userWithoutPassword } = existingUser.toJSON();
      
      console.log('✅ Demo user updated successfully!');
      console.log('📋 User details:', {
        id: userWithoutPassword.id,
        email: userWithoutPassword.email,
        firstName: userWithoutPassword.firstName,
        lastName: userWithoutPassword.lastName,
        role: userWithoutPassword.role,
        status: userWithoutPassword.status,
        emailVerified: userWithoutPassword.emailVerified,
      });
      console.log('\n🔑 Login credentials:');
      console.log(`   Email: ${DEMO_USER.email}`);
      console.log(`   Password: ${DEMO_USER.password}`);
      console.log(`   Role: ${DEMO_USER.role}`);
      console.log('\n🎉 Demo user account is ready to use!');
      return; // Exit function, finally block will close connection
    }

    // Create new user
    console.log('📝 Creating new demo user...');
    const hashedPassword = await hashPassword(DEMO_USER.password);

    const user = await User.create({
      email: DEMO_USER.email,
      firstName: DEMO_USER.firstName,
      lastName: DEMO_USER.lastName,
      passwordHash: hashedPassword,
      role: DEMO_USER.role,
      status: DEMO_USER.status,
      emailVerified: DEMO_USER.emailVerified,
      emailVerificationCode: null, // No verification needed for demo account
      profileCompleted: DEMO_USER.profileCompleted,
    });

    const { passwordHash: _, emailVerificationCode: __, ...userWithoutPassword } = user.toJSON();

    console.log('✅ Demo user created successfully!');
    console.log('📋 User details:', {
      id: userWithoutPassword.id,
      email: userWithoutPassword.email,
      firstName: userWithoutPassword.firstName,
      lastName: userWithoutPassword.lastName,
      role: userWithoutPassword.role,
      status: userWithoutPassword.status,
      emailVerified: userWithoutPassword.emailVerified,
    });
    console.log('\n🔑 Login credentials:');
    console.log(`   Email: ${DEMO_USER.email}`);
    console.log(`   Password: ${DEMO_USER.password}`);
    console.log(`   Role: ${DEMO_USER.role}`);
    console.log('\n🎉 Demo user account is ready to use!');
  } catch (error) {
    console.error('❌ Error creating demo user:', error.message);
    if (error.stack) {
      console.error('Error stack:', error.stack);
    }
    process.exitCode = 1;
  } finally {
    await sequelize.close();
    console.log('🔚 Database connection closed');
  }
}

// Run the script
createDemoUser();

